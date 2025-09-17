-- Family Management Migration for Premium Family Plan
-- Creates tables and policies for family member management, invitations, and shared features

-- Create family_groups table
CREATE TABLE family_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'My Family',
    owner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    max_members INTEGER NOT NULL DEFAULT 6,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create family_memberships table
CREATE TABLE family_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'child')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_child BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(family_id, user_id)
);

-- Create family_invitations table
CREATE TABLE family_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'child')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create family_recipe_collections table (shared recipe books)
CREATE TABLE family_recipe_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    is_collaborative BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create family_collection_recipes table (recipe collection items)
CREATE TABLE family_collection_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES family_recipe_collections(id) ON DELETE CASCADE NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    added_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(collection_id, recipe_id)
);

-- Create family_shopping_lists table (bulk shopping lists)
CREATE TABLE family_shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    meal_plan_ids UUID[] DEFAULT '{}',
    items JSONB NOT NULL DEFAULT '[]',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add child-friendly columns to recipes table
ALTER TABLE recipes ADD COLUMN is_child_friendly BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN child_friendly_notes TEXT;
ALTER TABLE recipes ADD COLUMN allergen_info JSONB;
ALTER TABLE recipes ADD COLUMN age_appropriate_from INTEGER;

-- Create indexes for performance
CREATE INDEX idx_family_groups_owner_id ON family_groups(owner_id);
CREATE INDEX idx_family_memberships_family_id ON family_memberships(family_id);
CREATE INDEX idx_family_memberships_user_id ON family_memberships(user_id);
CREATE INDEX idx_family_invitations_family_id ON family_invitations(family_id);
CREATE INDEX idx_family_invitations_email ON family_invitations(email);
CREATE INDEX idx_family_invitations_token ON family_invitations(token);
CREATE INDEX idx_family_invitations_expires_at ON family_invitations(expires_at);
CREATE INDEX idx_family_recipe_collections_family_id ON family_recipe_collections(family_id);
CREATE INDEX idx_family_collection_recipes_collection_id ON family_collection_recipes(collection_id);
CREATE INDEX idx_family_collection_recipes_recipe_id ON family_collection_recipes(recipe_id);
CREATE INDEX idx_family_shopping_lists_family_id ON family_shopping_lists(family_id);
CREATE INDEX idx_recipes_child_friendly ON recipes(is_child_friendly) WHERE is_child_friendly = TRUE;

-- Enable Row Level Security
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_collection_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_shopping_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_groups
CREATE POLICY "Users can manage their own family groups" ON family_groups
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Family members can read their family groups" ON family_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM family_memberships fm 
            WHERE fm.family_id = family_groups.id 
            AND fm.user_id = auth.uid()
        )
    );

-- RLS Policies for family_memberships
CREATE POLICY "Family owners can manage memberships" ON family_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM family_groups fg 
            WHERE fg.id = family_memberships.family_id 
            AND fg.owner_id = auth.uid()
        )
    );

CREATE POLICY "Family members can read memberships" ON family_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM family_memberships fm 
            WHERE fm.family_id = family_memberships.family_id 
            AND fm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can read their own membership" ON family_memberships
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for family_invitations
CREATE POLICY "Family owners and admins can manage invitations" ON family_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM family_memberships fm 
            JOIN family_groups fg ON fg.id = fm.family_id
            WHERE fm.family_id = family_invitations.family_id 
            AND fm.user_id = auth.uid()
            AND (fg.owner_id = auth.uid() OR fm.role IN ('admin'))
        )
    );

-- RLS Policies for family_recipe_collections
CREATE POLICY "Family members can manage recipe collections" ON family_recipe_collections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM family_memberships fm 
            WHERE fm.family_id = family_recipe_collections.family_id 
            AND fm.user_id = auth.uid()
        )
    );

-- RLS Policies for family_collection_recipes
CREATE POLICY "Family members can manage collection recipes" ON family_collection_recipes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM family_recipe_collections frc
            JOIN family_memberships fm ON fm.family_id = frc.family_id
            WHERE frc.id = family_collection_recipes.collection_id 
            AND fm.user_id = auth.uid()
        )
    );

-- RLS Policies for family_shopping_lists
CREATE POLICY "Family members can manage shopping lists" ON family_shopping_lists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM family_memberships fm 
            WHERE fm.family_id = family_shopping_lists.family_id 
            AND fm.user_id = auth.uid()
        )
    );

-- Add update triggers
CREATE TRIGGER update_family_groups_updated_at 
    BEFORE UPDATE ON family_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_recipe_collections_updated_at 
    BEFORE UPDATE ON family_recipe_collections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_shopping_lists_updated_at 
    BEFORE UPDATE ON family_shopping_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's family information
CREATE OR REPLACE FUNCTION get_user_family_info(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH user_families AS (
        SELECT fg.id, fg.name, fg.owner_id, fm.role, fm.is_child
        FROM family_groups fg
        JOIN family_memberships fm ON fm.family_id = fg.id
        WHERE fm.user_id = user_uuid
    ),
    family_stats AS (
        SELECT 
            uf.id as family_id,
            uf.name as family_name,
            uf.owner_id,
            uf.role,
            uf.is_child,
            COUNT(fm.user_id) as member_count,
            ARRAY_AGG(up.email ORDER BY fm.joined_at) as member_emails
        FROM user_families uf
        JOIN family_memberships fm ON fm.family_id = uf.id
        JOIN user_profiles up ON up.id = fm.user_id
        GROUP BY uf.id, uf.name, uf.owner_id, uf.role, uf.is_child
    )
    SELECT JSON_BUILD_OBJECT(
        'has_family', CASE WHEN COUNT(*) > 0 THEN true ELSE false END,
        'families', JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', fs.family_id,
                'name', fs.family_name,
                'is_owner', fs.owner_id = user_uuid,
                'role', fs.role,
                'is_child', fs.is_child,
                'member_count', fs.member_count,
                'member_emails', fs.member_emails
            )
        )
    ) INTO result
    FROM family_stats fs;
    
    RETURN COALESCE(result, '{"has_family": false, "families": []}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create family invitation token
CREATE OR REPLACE FUNCTION create_family_invitation_token()
RETURNS TEXT AS $$
BEGIN
    -- Generate a secure random token
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept family invitation
CREATE OR REPLACE FUNCTION accept_family_invitation(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
    invitation_record RECORD;
    family_record RECORD;
    member_count INTEGER;
    result JSON;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM family_invitations
    WHERE token = invitation_token 
    AND expires_at > NOW() 
    AND accepted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN '{"success": false, "error": "Invalid or expired invitation"}'::JSON;
    END IF;
    
    -- Get family details and check member limit
    SELECT fg.*, COUNT(fm.user_id) as current_members
    INTO family_record
    FROM family_groups fg
    LEFT JOIN family_memberships fm ON fm.family_id = fg.id
    WHERE fg.id = invitation_record.family_id
    GROUP BY fg.id, fg.name, fg.owner_id, fg.max_members, fg.created_at, fg.updated_at;
    
    IF family_record.current_members >= family_record.max_members THEN
        RETURN '{"success": false, "error": "Family has reached maximum member limit"}'::JSON;
    END IF;
    
    -- Check if user is already a member
    SELECT COUNT(*) INTO member_count
    FROM family_memberships
    WHERE family_id = invitation_record.family_id 
    AND user_id = auth.uid();
    
    IF member_count > 0 THEN
        RETURN '{"success": false, "error": "User is already a family member"}'::JSON;
    END IF;
    
    -- Accept the invitation
    UPDATE family_invitations 
    SET accepted_at = NOW() 
    WHERE id = invitation_record.id;
    
    -- Add user to family
    INSERT INTO family_memberships (family_id, user_id, role, is_child)
    VALUES (
        invitation_record.family_id, 
        auth.uid(), 
        invitation_record.role, 
        invitation_record.role = 'child'
    );
    
    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'family_name', family_record.name,
        'role', invitation_record.role
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false, 
        'error', 'Failed to accept invitation: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;