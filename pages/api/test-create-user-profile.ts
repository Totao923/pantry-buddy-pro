import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔧 Creating user profile for mock user...');

    const supabase = createSupabaseClient();
    const mockUserId = '21fc3c81-a66a-4cf3-be35-c2b70a900864';
    const mockEmail = 'hescoto@icloud.com';

    // Check if user profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', mockUserId)
      .single();

    console.log('🔍 Existing profile check:', { existingProfile, checkError: checkError?.message });

    if (existingProfile) {
      return res.status(200).json({
        success: true,
        message: 'User profile already exists',
        data: existingProfile,
      });
    }

    // Create user profile
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        id: mockUserId,
        email: mockEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.log('✅ User profile created:', newProfile);
    console.log('❌ Create error:', createError);

    if (createError) {
      throw createError;
    }

    res.status(200).json({
      success: true,
      message: 'User profile created successfully',
      data: newProfile,
    });
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
