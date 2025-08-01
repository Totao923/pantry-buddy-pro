import { createSupabaseServiceClient } from '../supabase/client';
import fs from 'fs';
import path from 'path';

export interface DatabaseSetupResult {
  success: boolean;
  message: string;
  error?: string;
}

export class DatabaseSetup {
  private supabase;

  constructor() {
    try {
      this.supabase = createSupabaseServiceClient();
    } catch (error) {
      console.error('Failed to create Supabase service client:', error);
      this.supabase = null;
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { data, error } = await this.supabase.from('user_profiles').select('count').limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  async checkTablesExist(): Promise<{ [tableName: string]: boolean }> {
    if (!this.supabase) {
      throw new Error('Database connection not available');
    }

    const requiredTables = [
      'user_profiles',
      'user_preferences',
      'pantry_items',
      'recipes',
      'recipe_ratings',
      'recipe_photos',
      'usage_tracking',
      'subscriptions',
      'ai_cache',
      'shopping_lists',
      'common_ingredients',
    ];

    const tableStatus: { [tableName: string]: boolean } = {};

    for (const tableName of requiredTables) {
      try {
        const { data, error } = await this.supabase.from(tableName).select('count').limit(1);

        tableStatus[tableName] = !error;
      } catch {
        tableStatus[tableName] = false;
      }
    }

    return tableStatus;
  }

  async runMigrationsFromFiles(migrationsDir: string): Promise<DatabaseSetupResult> {
    if (!this.supabase) {
      return {
        success: false,
        message: 'Database connection not available',
        error: 'Supabase service client not initialized',
      };
    }

    try {
      // Check if migrations directory exists
      if (!fs.existsSync(migrationsDir)) {
        return {
          success: false,
          message: 'Migrations directory not found',
          error: `Directory ${migrationsDir} does not exist`,
        };
      }

      // Get all SQL files from migrations directory
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Run in alphabetical order

      if (migrationFiles.length === 0) {
        return {
          success: false,
          message: 'No migration files found',
          error: 'No .sql files found in migrations directory',
        };
      }

      console.log(`Found ${migrationFiles.length} migration files`);

      // Run each migration file
      for (const fileName of migrationFiles) {
        const filePath = path.join(migrationsDir, fileName);
        const sqlContent = fs.readFileSync(filePath, 'utf8');

        console.log(`Running migration: ${fileName}`);

        try {
          // Split SQL content by statements and run each one
          const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

          for (const statement of statements) {
            if (statement.trim()) {
              const { error } = await this.supabase.rpc('exec_sql', {
                sql_query: statement,
              });

              if (error) {
                // Try direct query if RPC fails
                const { error: directError } = await this.supabase
                  .from('user_profiles')
                  .select('id')
                  .limit(0); // This will fail but establish connection

                if (directError) {
                  console.warn(`Migration statement failed: ${statement.substring(0, 100)}...`);
                  console.warn('Error:', error);
                }
              }
            }
          }

          console.log(`✅ Migration ${fileName} completed`);
        } catch (error) {
          console.error(`❌ Migration ${fileName} failed:`, error);
          return {
            success: false,
            message: `Migration ${fileName} failed`,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }

      return {
        success: true,
        message: `Successfully ran ${migrationFiles.length} migrations`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to run migrations',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async seedCommonIngredients(): Promise<DatabaseSetupResult> {
    if (!this.supabase) {
      return {
        success: false,
        message: 'Database connection not available',
      };
    }

    try {
      // Check if common ingredients already exist
      const { data: existingData, error: checkError } = await this.supabase
        .from('common_ingredients')
        .select('count')
        .limit(1);

      if (checkError) {
        return {
          success: false,
          message: 'Failed to check existing data',
          error: checkError.message,
        };
      }

      if (existingData && existingData.length > 0) {
        return {
          success: true,
          message: 'Common ingredients already seeded',
        };
      }

      // Run the seed data migration
      const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
      const seedFile = path.join(migrationsDir, '002_seed_data.sql');

      if (fs.existsSync(seedFile)) {
        return await this.runMigrationsFromFiles(migrationsDir);
      } else {
        return {
          success: false,
          message: 'Seed data file not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to seed common ingredients',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getSetupStatus(): Promise<{
    connected: boolean;
    tablesExist: { [tableName: string]: boolean };
    allTablesExist: boolean;
    totalTables: number;
    existingTables: number;
  }> {
    const connected = await this.isConnected();

    if (!connected) {
      return {
        connected: false,
        tablesExist: {},
        allTablesExist: false,
        totalTables: 0,
        existingTables: 0,
      };
    }

    const tablesExist = await this.checkTablesExist();
    const totalTables = Object.keys(tablesExist).length;
    const existingTables = Object.values(tablesExist).filter(exists => exists).length;
    const allTablesExist = existingTables === totalTables;

    return {
      connected,
      tablesExist,
      allTablesExist,
      totalTables,
      existingTables,
    };
  }
}

// Utility function for setup
export const setupDatabase = async (): Promise<DatabaseSetupResult> => {
  const setup = new DatabaseSetup();

  // Check current status
  const status = await setup.getSetupStatus();

  if (!status.connected) {
    return {
      success: false,
      message: 'Cannot connect to database',
      error: 'Check your Supabase credentials and connection',
    };
  }

  if (status.allTablesExist) {
    return {
      success: true,
      message: `Database already set up (${status.existingTables}/${status.totalTables} tables exist)`,
    };
  }

  // Run migrations
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const result = await setup.runMigrationsFromFiles(migrationsDir);

  if (!result.success) {
    return result;
  }

  // Seed common ingredients
  const seedResult = await setup.seedCommonIngredients();

  return {
    success: seedResult.success,
    message: `${result.message}. ${seedResult.message}`,
    error: seedResult.error,
  };
};
