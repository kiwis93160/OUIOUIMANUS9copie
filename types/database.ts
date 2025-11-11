export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          name: string
          permissions: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          permissions: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          permissions?: Json
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role_id: string
          pin: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role_id: string
          pin: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role_id?: string
          pin?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          category_id: string
          image_url: string | null
          available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          category_id: string
          image_url?: string | null
          available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          category_id?: string
          image_url?: string | null
          available?: boolean
          updated_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          name: string
          unit: string
          quantity: number
          min_quantity: number
          cost_per_unit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          unit: string
          quantity: number
          min_quantity: number
          cost_per_unit: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          unit?: string
          quantity?: number
          min_quantity?: number
          cost_per_unit?: number
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          table_number: string | null
          status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
          total: number
          payment_method: 'cash' | 'card' | 'transfer' | null
          paid: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          table_number?: string | null
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
          total: number
          payment_method?: 'cash' | 'card' | 'transfer' | null
          paid?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          table_number?: string | null
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
          total?: number
          payment_method?: 'cash' | 'card' | 'transfer' | null
          paid?: boolean
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number
          notes?: string | null
          created_at: string
        }
        Update: {
          id?: string
          quantity?: number
          unit_price?: number
          subtotal?: number
          notes?: string | null
        }
      }
      sales: {
        Row: {
          id: string
          order_id: string
          total: number
          payment_method: 'cash' | 'card' | 'transfer'
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          total: number
          payment_method: 'cash' | 'card' | 'transfer'
          created_at?: string
        }
        Update: {
          total?: number
          payment_method?: 'cash' | 'card' | 'transfer'
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']