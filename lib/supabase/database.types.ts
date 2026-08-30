export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          city: string
          country_code: string
          created_at: string
          id: string
          label: string
          profile_id: string
          recipient_name: string
        }
        Insert: {
          address_line: string
          city: string
          country_code: string
          created_at?: string
          id?: string
          label: string
          profile_id: string
          recipient_name: string
        }
        Update: {
          address_line?: string
          city?: string
          country_code?: string
          created_at?: string
          id?: string
          label?: string
          profile_id?: string
          recipient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          operating_company_id: string | null
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          operating_company_id?: string | null
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          operating_company_id?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      authorizations: {
        Row: {
          created_at: string
          id: string
          jurisdiction: string
          operating_company_id: string
          reference: string
          status: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction: string
          operating_company_id: string
          reference: string
          status: string
          valid_from: string
          valid_until: string
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction?: string
          operating_company_id?: string
          reference?: string
          status?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorizations_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          market_id: string
          operating_company_id: string
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_id: string
          operating_company_id: string
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string
          operating_company_id?: string
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_previews: {
        Row: {
          created_at: string
          id: string
          operating_company_id: string
          origin_assessment_id: string
          storage_path: string | null
          watermark: string
        }
        Insert: {
          created_at?: string
          id?: string
          operating_company_id: string
          origin_assessment_id: string
          storage_path?: string | null
          watermark?: string
        }
        Update: {
          created_at?: string
          id?: string
          operating_company_id?: string
          origin_assessment_id?: string
          storage_path?: string | null
          watermark?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_previews_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_previews_origin_assessment_id_fkey"
            columns: ["origin_assessment_id"]
            isOneToOne: false
            referencedRelation: "origin_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_legs: {
        Row: {
          created_at: string
          destination_node_id: string | null
          id: string
          mode: string
          operating_company_id: string
          origin_node_id: string | null
          sequence_no: number
          shipment_id: string
          status: string
        }
        Insert: {
          created_at?: string
          destination_node_id?: string | null
          id?: string
          mode: string
          operating_company_id: string
          origin_node_id?: string | null
          sequence_no: number
          shipment_id: string
          status?: string
        }
        Update: {
          created_at?: string
          destination_node_id?: string | null
          id?: string
          mode?: string
          operating_company_id?: string
          origin_node_id?: string | null
          sequence_no?: number
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_legs_destination_node_id_fkey"
            columns: ["destination_node_id"]
            isOneToOne: false
            referencedRelation: "ports_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_legs_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_legs_origin_node_id_fkey"
            columns: ["origin_node_id"]
            isOneToOne: false
            referencedRelation: "ports_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_legs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_state_snapshots: {
        Row: {
          id: string
          payload: Json
          revision: number
          updated_at: string
        }
        Insert: {
          id: string
          payload: Json
          revision?: number
          updated_at?: string
        }
        Update: {
          id?: string
          payload?: Json
          revision?: number
          updated_at?: string
        }
        Relationships: []
      }
      drones: {
        Row: {
          airworthiness_current: boolean
          battery_percent: number
          id: string
          operating_company_id: string
          payload_limit_grams: number
          reference: string
        }
        Insert: {
          airworthiness_current?: boolean
          battery_percent: number
          id?: string
          operating_company_id: string
          payload_limit_grams: number
          reference: string
        }
        Update: {
          airworthiness_current?: boolean
          battery_percent?: number
          id?: string
          operating_company_id?: string
          payload_limit_grams?: number
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "drones_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_quotes: {
        Row: {
          created_at: string
          id: string
          operating_company_id: string
          origin_assessment_id: string
          quote: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          operating_company_id: string
          origin_assessment_id: string
          quote: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          operating_company_id?: string
          origin_assessment_id?: string
          quote?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_quotes_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_quotes_origin_assessment_id_fkey"
            columns: ["origin_assessment_id"]
            isOneToOne: false
            referencedRelation: "origin_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          created_at: string
          geometry: Json
          id: string
          operating_company_id: string
          reference: string
          status: string
        }
        Insert: {
          created_at?: string
          geometry?: Json
          id?: string
          operating_company_id: string
          reference: string
          status?: string
        }
        Update: {
          created_at?: string
          geometry?: Json
          id?: string
          operating_company_id?: string
          reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          actor_id: string | null
          created_at: string
          key: string
          operation: string
          response: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          key: string
          operation: string
          response: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          key?: string
          operation?: string
          response?: Json
        }
        Relationships: []
      }
      inventory_balances: {
        Row: {
          available_quantity: number
          batch_id: string
          id: string
          operating_company_id: string
          reserved_quantity: number
          site_id: string
          updated_at: string
        }
        Insert: {
          available_quantity: number
          batch_id: string
          id?: string
          operating_company_id: string
          reserved_quantity?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          batch_id?: string
          id?: string
          operating_company_id?: string
          reserved_quantity?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          allocated: number
          customs_cleared: boolean
          expiry_date: string | null
          id: string
          inventory_class: Database["public"]["Enums"]["inventory_class"]
          operating_company_id: string
          origin_supported: boolean
          product_id: string
          quantity: number
          quarantined: boolean
          reference: string
          site_id: string
        }
        Insert: {
          allocated?: number
          customs_cleared?: boolean
          expiry_date?: string | null
          id?: string
          inventory_class: Database["public"]["Enums"]["inventory_class"]
          operating_company_id: string
          origin_supported?: boolean
          product_id: string
          quantity: number
          quarantined?: boolean
          reference: string
          site_id: string
        }
        Update: {
          allocated?: number
          customs_cleared?: boolean
          expiry_date?: string | null
          id?: string
          inventory_class?: Database["public"]["Enums"]["inventory_class"]
          operating_company_id?: string
          origin_supported?: boolean
          product_id?: string
          quantity?: number
          quarantined?: boolean
          reference?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          batch_id: string
          created_at: string
          from_site_id: string | null
          id: string
          movement_type: string
          operating_company_id: string
          order_id: string | null
          quantity: number
          to_site_id: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          from_site_id?: string | null
          id?: string
          movement_type: string
          operating_company_id: string
          order_id?: string | null
          quantity: number
          to_site_id?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          from_site_id?: string | null
          id?: string
          movement_type?: string
          operating_company_id?: string
          order_id?: string | null
          quantity?: number
          to_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_from_site_id_fkey"
            columns: ["from_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_site_id_fkey"
            columns: ["to_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      market_configs: {
        Row: {
          checkout_enabled: boolean
          created_at: string
          id: string
          language: string
          market_id: string
          operating_company_id: string
          tax_duty_status: string
        }
        Insert: {
          checkout_enabled?: boolean
          created_at?: string
          id?: string
          language: string
          market_id: string
          operating_company_id: string
          tax_duty_status: string
        }
        Update: {
          checkout_enabled?: boolean
          created_at?: string
          id?: string
          language?: string
          market_id?: string
          operating_company_id?: string
          tax_duty_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_configs_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_configs_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          created_at: string
          currency: string
          id: string
          market_id: string
          operating_company_id: string
          price_minor: number
          product_id: string
          purchasable: boolean
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          market_id: string
          operating_company_id: string
          price_minor: number
          product_id: string
          purchasable?: boolean
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          market_id?: string
          operating_company_id?: string
          price_minor?: number
          product_id?: string
          purchasable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      market_prices: {
        Row: {
          currency: string
          id: string
          market_id: string
          operating_company_id: string
          price_minor: number
          product_id: string
          valid_from: string
        }
        Insert: {
          currency: string
          id?: string
          market_id: string
          operating_company_id: string
          price_minor: number
          product_id: string
          valid_from?: string
        }
        Update: {
          currency?: string
          id?: string
          market_id?: string
          operating_company_id?: string
          price_minor?: number
          product_id?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_prices_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          code: string
          created_at: string
          currency: string
          id: string
          language: string
          launch_phase: number
          localization_required: string | null
          name: string
          status: Database["public"]["Enums"]["market_status"]
        }
        Insert: {
          code: string
          created_at?: string
          currency: string
          id?: string
          language: string
          launch_phase: number
          localization_required?: string | null
          name: string
          status: Database["public"]["Enums"]["market_status"]
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          id?: string
          language?: string
          launch_phase?: number
          localization_required?: string | null
          name?: string
          status?: Database["public"]["Enums"]["market_status"]
        }
        Relationships: []
      }
      media: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_companies: {
        Row: {
          country_code: string
          created_at: string
          id: string
          legal_name: string
          reference: string
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          legal_name: string
          reference: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          legal_name?: string
          reference?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          detail: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          detail: string
          id?: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          id: string
          order_id: string
          origin_snapshot: Database["public"]["Enums"]["inventory_class"]
          price_minor: number
          product_id: string
          product_snapshot: Json
          quantity: number
          seller_snapshot: string
          tax_minor: number
        }
        Insert: {
          id?: string
          order_id: string
          origin_snapshot: Database["public"]["Enums"]["inventory_class"]
          price_minor: number
          product_id: string
          product_snapshot?: Json
          quantity: number
          seller_snapshot: string
          tax_minor: number
        }
        Update: {
          id?: string
          order_id?: string
          origin_snapshot?: Database["public"]["Enums"]["inventory_class"]
          price_minor?: number
          product_id?: string
          product_snapshot?: Json
          quantity?: number
          seller_snapshot?: string
          tax_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          delivery_minor: number
          id: string
          market_id: string
          operating_company_id: string
          profile_id: string
          reference: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          delivery_minor: number
          id?: string
          market_id: string
          operating_company_id: string
          profile_id: string
          reference: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          delivery_minor?: number
          id?: string
          market_id?: string
          operating_company_id?: string
          profile_id?: string
          reference?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      origin_assessments: {
        Row: {
          batch_id: string
          certificate_watermark: string
          created_at: string
          duty_quote: string
          evidence: Json
          id: string
          operating_company_id: string
          status: Database["public"]["Enums"]["origin_status"]
          transformation_summary: string
        }
        Insert: {
          batch_id: string
          certificate_watermark?: string
          created_at?: string
          duty_quote: string
          evidence?: Json
          id?: string
          operating_company_id: string
          status?: Database["public"]["Enums"]["origin_status"]
          transformation_summary: string
        }
        Update: {
          batch_id?: string
          certificate_watermark?: string
          created_at?: string
          duty_quote?: string
          evidence?: Json
          id?: string
          operating_company_id?: string
          status?: Database["public"]["Enums"]["origin_status"]
          transformation_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "origin_assessments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "origin_assessments_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      origin_evidence: {
        Row: {
          created_at: string
          description: string
          evidence_type: string
          id: string
          operating_company_id: string
          origin_record_id: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          description: string
          evidence_type: string
          id?: string
          operating_company_id: string
          origin_record_id: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          evidence_type?: string
          id?: string
          operating_company_id?: string
          origin_record_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "origin_evidence_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "origin_evidence_origin_record_id_fkey"
            columns: ["origin_record_id"]
            isOneToOne: false
            referencedRelation: "origin_records"
            referencedColumns: ["id"]
          },
        ]
      }
      origin_records: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          operating_company_id: string
          status: Database["public"]["Enums"]["origin_status"]
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          operating_company_id: string
          status?: Database["public"]["Enums"]["origin_status"]
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          operating_company_id?: string
          status?: Database["public"]["Enums"]["origin_status"]
        }
        Relationships: [
          {
            foreignKeyName: "origin_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "origin_records_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          order_id: string
          provider_reference: string
          status: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          id?: string
          idempotency_key: string
          order_id: string
          provider_reference: string
          status: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          order_id?: string
          provider_reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ports_nodes: {
        Row: {
          created_at: string
          id: string
          market_id: string
          name: string
          node_type: string
          operating_company_id: string
          reference: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_id: string
          name: string
          node_type: string
          operating_company_id: string
          reference: string
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string
          name?: string
          node_type?: string
          operating_company_id?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "ports_nodes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ports_nodes_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          inventory_class: Database["public"]["Enums"]["inventory_class"]
          name: string
          producer: string
          reference: string
          weight_grams: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          inventory_class: Database["public"]["Enums"]["inventory_class"]
          name: string
          producer: string
          reference: string
          weight_grams: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          inventory_class?: Database["public"]["Enums"]["inventory_class"]
          name?: string
          producer?: string
          reference?: string
          weight_grams?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          market_id: string | null
          operating_company_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          market_id?: string | null
          operating_company_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          market_id?: string | null
          operating_company_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string
          profile_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          profile_id: string
          score: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          profile_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          id: string
          operating_company_id: string
          received_at: string
          reference: string
          site_id: string
          status: string
          supplier_id: string | null
        }
        Insert: {
          id?: string
          operating_company_id: string
          received_at?: string
          reference: string
          site_id: string
          status?: string
          supplier_id?: string | null
        }
        Update: {
          id?: string
          operating_company_id?: string
          received_at?: string
          reference?: string
          site_id?: string
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          order_id: string
          profile_id: string
          reason: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          profile_id: string
          reason: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          profile_id?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          delivery_method: string
          id: string
          operating_company_id: string
          order_id: string
          reference: string
          weight_grams: number
        }
        Insert: {
          created_at?: string
          delivery_method: string
          id?: string
          operating_company_id: string
          order_id: string
          reference: string
          weight_grams: number
        }
        Update: {
          created_at?: string
          delivery_method?: string
          id?: string
          operating_company_id?: string
          order_id?: string
          reference?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipments_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          id: string
          market_id: string | null
          name: string
          operating_company_id: string
          reference: string
          site_type: string
        }
        Insert: {
          id?: string
          market_id?: string | null
          name: string
          operating_company_id: string
          reference: string
          site_type: string
        }
        Update: {
          id?: string
          market_id?: string | null
          name?: string
          operating_company_id?: string
          reference?: string
          site_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sortie_events: {
        Row: {
          created_at: string
          detail: string
          id: string
          operating_company_id: string
          sortie_id: string
          status: Database["public"]["Enums"]["sortie_status"]
        }
        Insert: {
          created_at?: string
          detail: string
          id?: string
          operating_company_id: string
          sortie_id: string
          status: Database["public"]["Enums"]["sortie_status"]
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          operating_company_id?: string
          sortie_id?: string
          status?: Database["public"]["Enums"]["sortie_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sortie_events_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sortie_events_sortie_id_fkey"
            columns: ["sortie_id"]
            isOneToOne: false
            referencedRelation: "sorties"
            referencedColumns: ["id"]
          },
        ]
      }
      sorties: {
        Row: {
          created_at: string
          drone_id: string
          id: string
          operating_company_id: string
          reference: string
          shipment_id: string
          status: Database["public"]["Enums"]["sortie_status"]
          weather_status: string
        }
        Insert: {
          created_at?: string
          drone_id: string
          id?: string
          operating_company_id: string
          reference: string
          shipment_id: string
          status?: Database["public"]["Enums"]["sortie_status"]
          weather_status?: string
        }
        Update: {
          created_at?: string
          drone_id?: string
          id?: string
          operating_company_id?: string
          reference?: string
          shipment_id?: string
          status?: Database["public"]["Enums"]["sortie_status"]
          weather_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sorties_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sorties_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sorties_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          country_code: string
          created_at: string
          id: string
          name: string
          operating_company_id: string
          reference: string
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          name: string
          operating_company_id: string
          reference: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          operating_company_id?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          reference: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          reference: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          reference?: string
        }
        Relationships: []
      }
      trade_lanes: {
        Row: {
          created_at: string
          destination_market_id: string
          destination_node_id: string | null
          id: string
          operating_company_id: string
          origin_market_id: string
          origin_node_id: string | null
          reference: string
          status: string
        }
        Insert: {
          created_at?: string
          destination_market_id: string
          destination_node_id?: string | null
          id?: string
          operating_company_id: string
          origin_market_id: string
          origin_node_id?: string | null
          reference: string
          status?: string
        }
        Update: {
          created_at?: string
          destination_market_id?: string
          destination_node_id?: string | null
          id?: string
          operating_company_id?: string
          origin_market_id?: string
          origin_node_id?: string | null
          reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_lanes_destination_market_id_fkey"
            columns: ["destination_market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_lanes_destination_node_id_fkey"
            columns: ["destination_node_id"]
            isOneToOne: false
            referencedRelation: "ports_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_lanes_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_lanes_origin_market_id_fkey"
            columns: ["origin_market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_lanes_origin_node_id_fkey"
            columns: ["origin_node_id"]
            isOneToOne: false
            referencedRelation: "ports_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          destination_site_id: string
          id: string
          operating_company_id: string
          origin_site_id: string
          reference: string
          status: Database["public"]["Enums"]["transfer_status"]
        }
        Insert: {
          created_at?: string
          destination_site_id: string
          id?: string
          operating_company_id: string
          origin_site_id: string
          reference: string
          status?: Database["public"]["Enums"]["transfer_status"]
        }
        Update: {
          created_at?: string
          destination_site_id?: string
          id?: string
          operating_company_id?: string
          origin_site_id?: string
          reference?: string
          status?: Database["public"]["Enums"]["transfer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "transfers_destination_site_id_fkey"
            columns: ["destination_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_origin_site_id_fkey"
            columns: ["origin_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_records: {
        Row: {
          facility: string
          id: string
          operating_company_id: string
          origin_record_id: string
          recorded_at: string
          summary: string
        }
        Insert: {
          facility: string
          id?: string
          operating_company_id: string
          origin_record_id: string
          recorded_at?: string
          summary: string
        }
        Update: {
          facility?: string
          id?: string
          operating_company_id?: string
          origin_record_id?: string
          recorded_at?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_records_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformation_records_origin_record_id_fkey"
            columns: ["origin_record_id"]
            isOneToOne: false
            referencedRelation: "origin_records"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          reference: string
          sku: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          reference: string
          sku: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          reference?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          operating_company_id: string
          order_id: string | null
          site_id: string
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          operating_company_id: string
          order_id?: string | null
          site_id: string
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          operating_company_id?: string
          order_id?: string | null
          site_id?: string
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_tasks_operating_company_id_fkey"
            columns: ["operating_company_id"]
            isOneToOne: false
            referencedRelation: "operating_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_snapshots: {
        Row: {
          id: string
          observed_at: string
          precipitation: boolean
          sortie_id: string
          status: string
          wind_kph: number
        }
        Insert: {
          id?: string
          observed_at?: string
          precipitation?: boolean
          sortie_id: string
          status: string
          wind_kph: number
        }
        Update: {
          id?: string
          observed_at?: string
          precipitation?: boolean
          sortie_id?: string
          status?: string
          wind_kph?: number
        }
        Relationships: [
          {
            foreignKeyName: "weather_snapshots_sortie_id_fkey"
            columns: ["sortie_id"]
            isOneToOne: false
            referencedRelation: "sorties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      inventory_class:
        | "direct_import"
        | "ghana_origin_export"
        | "marketplace_future"
      market_status: "active" | "roadmap" | "future"
      order_status:
        | "pending_payment"
        | "paid"
        | "allocated"
        | "picked"
        | "packed"
        | "dispatched"
        | "delivered"
      origin_status:
        | "unassessed"
        | "evidence_pending"
        | "provisionally_eligible"
        | "demo_approved"
        | "rejected"
      sortie_status:
        | "draft"
        | "preflight"
        | "cleared"
        | "launched"
        | "en_route"
        | "delivered"
        | "lockout"
        | "override"
        | "abort"
        | "return"
        | "courier_fallback"
      transfer_status:
        | "draft"
        | "cleared_for_export"
        | "in_transit"
        | "customs_received"
        | "warehouse_received"
      user_role:
        | "consumer"
        | "business_buyer"
        | "warehouse_operator"
        | "dispatcher"
        | "safety_officer"
        | "ground_courier"
        | "finance"
        | "administrator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      inventory_class: [
        "direct_import",
        "ghana_origin_export",
        "marketplace_future",
      ],
      market_status: ["active", "roadmap", "future"],
      order_status: [
        "pending_payment",
        "paid",
        "allocated",
        "picked",
        "packed",
        "dispatched",
        "delivered",
      ],
      origin_status: [
        "unassessed",
        "evidence_pending",
        "provisionally_eligible",
        "demo_approved",
        "rejected",
      ],
      sortie_status: [
        "draft",
        "preflight",
        "cleared",
        "launched",
        "en_route",
        "delivered",
        "lockout",
        "override",
        "abort",
        "return",
        "courier_fallback",
      ],
      transfer_status: [
        "draft",
        "cleared_for_export",
        "in_transit",
        "customs_received",
        "warehouse_received",
      ],
      user_role: [
        "consumer",
        "business_buyer",
        "warehouse_operator",
        "dispatcher",
        "safety_officer",
        "ground_courier",
        "finance",
        "administrator",
      ],
    },
  },
} as const

