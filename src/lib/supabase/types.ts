export type UserDataNamespace =
  | 'settings'
  | 'training_preferences'
  | 'learning_progress'
  | 'mistakes'
  | 'favorites'
  | 'test_history'
  | 'recent_learning'
  | 'neural_state';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          preferred_language: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          preferred_language?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          preferred_language?: string | null;
          updated_at?: string;
        };
      };
      user_data_documents: {
        Row: {
          user_id: string;
          namespace: UserDataNamespace;
          schema_version: number;
          revision: number;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          namespace: UserDataNamespace;
          schema_version?: number;
          revision?: number;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          schema_version?: number;
          revision?: number;
          payload?: Json;
          updated_at?: string;
        };
      };
    };
  };
};

export type SupabaseConfigStatus = 'configured' | 'missing';
