

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Character, CharacterSummary, Campaign, SharedDocument, CampaignArchive, MapScene, MapConfig, User, CampaignMember } from '../types';
import { hashPassword, verifyPassword } from './cryptoService';

// Credenciais fornecidas pelo usuário
const SUPABASE_URL = 'https://vkrbupqcpupsglknvmhm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmJ1cHFjcHVwc2dsa252bWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NTA5ODQsImV4cCI6MjA3OTQyNjk4NH0.kdnFrIJtj5LElDrMJqDKeaRrhPnsO9x2rTRGiX7ATmY';

// Inicializa o cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const dbService = {
  
  // --- AUTHENTICATION (V3.0) ---

  subscribeToAuthChanges: (callback: (event: string, session: any) => void) => {
      return supabase.auth.onAuthStateChange(callback);
  },

  register: async (username: string, password: string): Promise<User> => {
      const passwordHash = await hashPassword(password);
      const { data, error } = await supabase
        .from('users')
        .insert({ username, password_hash: passwordHash })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return { id: data.id, username: data.username };
  },

  login: async (username: string, password: string): Promise<User | null> => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error || !data) return null;

      const isValid = await verifyPassword(password, data.password_hash);
      if (!isValid) return null;

      return { 
          id: data.id, 
          username: data.username,
          isGlobalAdmin: data.username === 'admin',
          email: data.email,
          emailVerified: data.email_verified,
          avatarUrl: data.avatar_url
      };
  },

  getUserByUsername: async (username: string): Promise<User | null> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, email_verified, avatar_url')
        .eq('username', username)
        .single();
      if (error) return null;
      return {
        id: data.id,
        username: data.username,
        email: data.email,
        emailVerified: data.email_verified,
        avatarUrl: data.avatar_url
      };
  },

  // --- Email & Security Features (Supabase Auth) ---

  linkAccount: async (userId: string, email: string, password: string): Promise<void> => {
      // Create a Supabase Auth user. This sends a confirmation email automatically.
      const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: window.location.origin
          }
      });

      if (error) throw new Error(error.message);

      // Update public.users table to reflect the linked email
      const { error: updateError } = await supabase
          .from('users')
          .update({ email: email })
          .eq('id', userId);

      if (updateError) {
          console.error("Failed to update public user email:", updateError);
          // We don't throw here because the auth account was created successfully.
          // The user might need to retry or we can handle it silently.
      }
  },

  requestPasswordReset: async (email: string): Promise<void> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw new Error(error.message);
  },

  updatePassword: async (password: string): Promise<void> => {
      // 1. Update Auth Password
      const { data: authData, error } = await supabase.auth.updateUser({ password: password });
      if (error) throw new Error(error.message);

      // 2. Update Public User Hash (to keep username login working)
      if (authData.user && authData.user.email) {
          const newHash = await hashPassword(password);
          const { error: dbError } = await supabase
              .from('users')
              .update({ password_hash: newHash })
              .eq('email', authData.user.email);
          
          if (dbError) console.error("Error syncing password hash:", dbError);
      }
  },

  // --- USER PROFILE MANAGEMENT ---
  updateUserProfile: async (userId: string, updates: { username?: string, avatarUrl?: string, email?: string }): Promise<void> => {
      const payload: any = {};
      if (updates.username !== undefined) payload.username = updates.username;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
      if (updates.email !== undefined) payload.email = updates.email;

      const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', userId);
      
      if (error) throw new Error(error.message);
  },

  updateUserEmail: async (email: string): Promise<void> => {
      const { error } = await supabase.auth.updateUser({ email: email });
      if (error) throw new Error(error.message);
  },

  // --- Campaign Members Management ---

  inviteUserToCampaign: async (campaignId: string, username: string, role: 'GM' | 'PLAYER'): Promise<void> => {
      const user = await dbService.getUserByUsername(username);
      if (!user) throw new Error("Usuário não encontrado.");

      const { error } = await supabase
        .from('campaign_members')
        .insert({
            campaign_id: campaignId,
            user_id: user.id,
            role: role
        });
      
      if (error) {
          if (error.code === '23505') throw new Error("Usuário já está na campanha.");
          throw new Error(error.message);
      }
  },

  removeMember: async (campaignId: string, userId: string): Promise<void> => {
      const { error } = await supabase
        .from('campaign_members')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', userId);
      
      if (error) throw new Error(error.message);
  },

  getCampaignMembers: async (campaignId: string): Promise<CampaignMember[]> => {
      // Join with users table to get usernames
      const { data, error } = await supabase
        .from('campaign_members')
        .select('*, users(username)')
        .eq('campaign_id', campaignId);
      
      if (error) return [];
      
      return data.map((d: any) => ({
          id: d.id,
          campaignId: d.campaign_id,
          userId: d.user_id,
          role: d.role,
          addedAt: d.added_at,
          username: d.users?.username || 'Desconhecido'
      }));
  },

  // Define um novo Mestre (GM) para a campanha sem alterar o Dono (Admin)
  setCampaignGM: async (campaignId: string, newGmId: string): Promise<void> => {
      // 1. Update Campaign GM ID
      const { error: campError } = await supabase
        .from('campaigns')
        .update({ gm_id: newGmId })
        .eq('id', campaignId);
      
      if (campError) throw new Error(campError.message);

      // 2. Ensure new GM has 'GM' role in members table
      // We rely on the constraint name explicitly if needed, but standard ON CONFLICT usually works with columns
      // if the constraint is correctly set up.
      const { error: memberError } = await supabase
        .from('campaign_members')
        .upsert({ 
            campaign_id: campaignId, 
            user_id: newGmId, 
            role: 'GM' 
        }, { onConflict: 'campaign_id,user_id', ignoreDuplicates: false });

      if (memberError) throw new Error(memberError.message);
  },

  transferCampaignOwnership: async (campaignId: string, newOwnerId: string): Promise<void> => {
      // 1. Update Campaign Owner (Admin)
      const { error: campError } = await supabase
        .from('campaigns')
        .update({ owner_id: newOwnerId })
        .eq('id', campaignId);
      
      if (campError) throw new Error(campError.message);

      // 2. Also promote to GM role to avoid access issues
      const { error: memberError } = await supabase
        .from('campaign_members')
        .upsert({ 
            campaign_id: campaignId, 
            user_id: newOwnerId, 
            role: 'GM' 
        }, { onConflict: 'campaign_id,user_id', ignoreDuplicates: false });

      if (memberError) throw new Error(memberError.message);
  },

  // --- Campaign Operations ---
  
  listCampaigns: async (currentUser: User): Promise<Campaign[]> => {
    // If Global Admin, return ALL campaigns
    if (currentUser.isGlobalAdmin) {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('createdAt', { ascending: false });
        if (error) return [];
        return data ? data.map((d: any) => ({ ...d, ownerId: d.owner_id, gmId: d.gm_id })) : [];
    }

    // Otherwise, fetch campaigns owned by user OR where user is a member OR where user is GM
    const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('*, campaign_members!inner(user_id)')
        .or(`owner_id.eq.${currentUser.id},gm_id.eq.${currentUser.id},campaign_members.user_id.eq.${currentUser.id}`);

    // The query above with inner join might filter out campaigns where I am owner but NOT member (rare but possible in old data)
    // A simpler approach to avoid complex joins issues in client lib:
    
    // 1. Get campaigns I own or GM
    const { data: owned, error: errOwned } = await supabase
        .from('campaigns')
        .select('*')
        .or(`owner_id.eq.${currentUser.id},gm_id.eq.${currentUser.id}`);

    // 2. Get campaigns I am a member of
    const { data: memberOf, error: errMember } = await supabase
        .from('campaign_members')
        .select('campaign_id, campaigns(*)')
        .eq('user_id', currentUser.id);

    const campaignsMap = new Map<string, Campaign>();

    if (owned) {
        owned.forEach((c: any) => {
            campaignsMap.set(c.id, { ...c, ownerId: c.owner_id, gmId: c.gm_id });
        });
    }

    if (memberOf) {
        memberOf.forEach((m: any) => {
            if (m.campaigns) {
                campaignsMap.set(m.campaigns.id, { ...m.campaigns, ownerId: m.campaigns.owner_id, gmId: m.campaigns.gm_id });
            }
        });
    }

    return Array.from(campaignsMap.values()).sort((a,b) => b.createdAt - a.createdAt);
  },

  getCampaignById: async (id: string): Promise<Campaign | null> => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return {
        ...data,
        ownerId: data.owner_id,
        gmId: data.gm_id
    };
  },

  createCampaign: async (campaign: Campaign): Promise<void> => {
    // Ensure we map camelCase to snake_case
    const payload = {
        ...campaign,
        owner_id: campaign.ownerId,
        gm_id: campaign.gmId
    };
    delete (payload as any).ownerId;
    delete (payload as any).gmId;

    const { error } = await supabase
      .from('campaigns')
      .insert(payload);

    if (error) throw new Error(error.message);
  },

  updateCampaign: async (campaign: Campaign): Promise<void> => {
    const payload = { ...campaign };
    
    if (campaign.ownerId) {
        (payload as any).owner_id = campaign.ownerId;
        delete (payload as any).ownerId;
    }
    if (campaign.gmId) {
        (payload as any).gm_id = campaign.gmId;
        delete (payload as any).gmId;
    }

    const { error } = await supabase
      .from('campaigns')
      .update(payload)
      .eq('id', campaign.id);

    if (error) throw new Error(error.message);
  },

  deleteCampaign: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  // --- Campaign Archives Operations ---
  
  getCampaignArchives: async (campaignId: string): Promise<CampaignArchive[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('archives')
        .eq('id', campaignId)
        .single();
      
      if (error || !data) return [];
      return data.archives || [];
  },

  updateCampaignArchives: async (campaignId: string, archives: CampaignArchive[]): Promise<void> => {
      const { error } = await supabase
        .from('campaigns')
        .update({ archives: archives })
        .eq('id', campaignId);
      
      if (error) throw new Error(error.message);
  },

  // --- Map Scenes Operations ---
  
  listMapScenes: async (campaignId: string): Promise<MapScene[]> => {
      const { data, error } = await supabase
        .from('map_scenes')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      
      if (error) {
          console.error("Error listing map scenes", error);
          return [];
      }
      return data.map((d: any) => ({
          id: d.id,
          campaignId: d.campaign_id,
          name: d.name,
          config: d.config,
          createdAt: d.created_at
      }));
  },

  saveMapScene: async (campaignId: string, name: string, config: MapConfig): Promise<void> => {
      const { error } = await supabase
        .from('map_scenes')
        .insert({
            campaign_id: campaignId,
            name: name,
            config: config
        });
      
      if (error) throw new Error(error.message);
  },

  deleteMapScene: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('map_scenes')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
  },

  // --- Character Operations ---

  listCharacters: async (campaignId: string): Promise<CharacterSummary[]> => {
    // Now selecting users(username) to display who owns the character
    const { data, error } = await supabase
      .from('characters')
      .select('*, users(username)') 
      .eq('campaignId', campaignId)
      .order('nex', { ascending: false });

    if (error) {
      console.error('Erro ao listar personagens:', error.message || error);
      return [];
    }
    
    return data.map((d: any) => ({
        ...d,
        ownerId: d.owner_id,
        ownerUsername: d.users?.username || 'Desconhecido'
    }));
  },

  getCharacterById: async (id: string): Promise<Character | null> => {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return {
        ...data,
        ownerId: data.owner_id
    };
  },

  createCharacter: async (character: Character): Promise<void> => {
    const payload = { ...character, owner_id: character.ownerId };
    delete (payload as any).ownerId;

    const { error } = await supabase
      .from('characters')
      .insert(payload);

    if (error) throw new Error(error.message);
  },

  updateCharacter: async (character: Character): Promise<void> => {
    const updatedChar = { ...character, updatedAt: Date.now() };
    const payload = { ...updatedChar, owner_id: character.ownerId };
    delete (payload as any).ownerId;
    
    const { error } = await supabase
      .from('characters')
      .update(payload)
      .eq('id', character.id);

    if (error) throw new Error(error.message);
  },

  updateCharacterPartial: async (id: string, updates: Partial<Character>): Promise<void> => {
    const payload = { ...updates };
    if (updates.ownerId) {
        (payload as any).owner_id = updates.ownerId;
        delete payload.ownerId;
    }

    const { error } = await supabase
      .from('characters')
      .update(payload)
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  deleteCharacter: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  // --- Shared Documents ---
  
  getSharedDocuments: async (campaignId: string): Promise<SharedDocument[]> => {
      const { data, error } = await supabase
          .from('characters')
          .select('id, name, documents')
          .eq('campaignId', campaignId);

      if (error || !data) return [];

      const sharedDocs: SharedDocument[] = [];

      data.forEach((char: any) => {
          if (Array.isArray(char.documents)) {
              char.documents.forEach((doc: any) => {
                  if (doc && (doc.isShared || doc.isPublic || (doc.sharedWith && doc.sharedWith.length > 0))) {
                      sharedDocs.push({
                          ...doc,
                          ownerName: char.name,
                          characterId: char.id
                      });
                  }
              });
          }
      });

      return sharedDocs;
  },

  getAllCampaignDocuments: async (campaignId: string): Promise<SharedDocument[]> => {
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, documents')
      .eq('campaignId', campaignId);

    if (error || !data) return [];

    const allDocs: SharedDocument[] = [];
    data.forEach((char: any) => {
        if (Array.isArray(char.documents)) {
            char.documents.forEach((doc: any) => {
                allDocs.push({
                    ...doc,
                    ownerName: char.name,
                    characterId: char.id
                });
            });
        }
    });
    return allDocs;
  },

  // --- REALTIME SUBSCRIPTIONS ---

  subscribeToCampaignList: (onUpdate: () => void): RealtimeChannel => {
    return supabase
      .channel('public:campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
        onUpdate();
      })
      .subscribe();
  },

  subscribeToCampaign: (campaignId: string, onUpdate: (newData: Campaign) => void): RealtimeChannel => {
    return supabase
      .channel(`campaign:${campaignId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` }, 
        (payload) => {
          // Map incoming payload snake_case to camelCase
          const data = payload.new as any;
          if (data.owner_id) data.ownerId = data.owner_id;
          if (data.gm_id) data.gmId = data.gm_id;
          onUpdate(data as Campaign);
        }
      )
      .subscribe();
  },

  subscribeToCharacterList: (campaignId: string, onUpdate: () => void): RealtimeChannel => {
    return supabase
      .channel(`chars_list:${campaignId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'characters', filter: `campaignId=eq.${campaignId}` }, 
        (payload) => {
           onUpdate();
        }
      )
      .subscribe();
  },

  subscribeToCharacter: (charId: string, onUpdate: (newData: Character) => void): RealtimeChannel => {
    return supabase
      .channel(`char:${charId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${charId}` }, 
        (payload) => {
          const data = payload.new as any;
          if (data.owner_id) data.ownerId = data.owner_id;
          onUpdate(data as Character);
        }
      )
      .subscribe();
  },

  // --- BROADCAST (MAP MOVEMENTS) ---
  joinMapRoom: (campaignId: string, onTokenMove: (payload: any) => void): RealtimeChannel => {
      return supabase
          .channel(`map_room:${campaignId}`)
          .on('broadcast', { event: 'token_move' }, (payload) => {
              onTokenMove(payload.payload);
          })
          .subscribe();
  },

  sendTokenMove: (channel: RealtimeChannel, payload: { id: string, x: number, y: number, flip?: boolean, rotation?: number, variant?: number, visible?: boolean }) => {
      channel.send({
          type: 'broadcast',
          event: 'token_move',
          payload: payload
      });
  },

  leaveMapRoom: (channel: RealtimeChannel) => {
      supabase.removeChannel(channel);
  }
};