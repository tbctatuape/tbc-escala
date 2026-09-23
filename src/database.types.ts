export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
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
      cultos: {
        Row: {
          created_at: string
          data: string
          horario: string
          id: string
          observacoes: string | null
          periodo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          data: string
          horario?: string
          id?: string
          observacoes?: string | null
          periodo?: string
          titulo: string
        }
        Update: {
          created_at?: string
          data?: string
          horario?: string
          id?: string
          observacoes?: string | null
          periodo?: string
          titulo?: string
        }
        Relationships: []
      }
      escala_itens: {
        Row: {
          created_at: string
          escala_id: string
          funcao_id: string
          id: string
          motivo_recusa: string | null
          status_confirmacao: string | null
          voluntario_id: string | null
        }
        Insert: {
          created_at?: string
          escala_id: string
          funcao_id: string
          id?: string
          motivo_recusa?: string | null
          status_confirmacao?: string | null
          voluntario_id?: string | null
        }
        Update: {
          created_at?: string
          escala_id?: string
          funcao_id?: string
          id?: string
          motivo_recusa?: string | null
          status_confirmacao?: string | null
          voluntario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escala_itens_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_itens_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_itens_voluntario_id_fkey"
            columns: ["voluntario_id"]
            isOneToOne: false
            referencedRelation: "voluntarios"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas: {
        Row: {
          created_at: string
          culto_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          culto_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          culto_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_culto_id_fkey"
            columns: ["culto_id"]
            isOneToOne: true
            referencedRelation: "cultos"
            referencedColumns: ["id"]
          },
        ]
      }
      funcoes: {
        Row: {
          ativa: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      indisponibilidades: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          motivo: string | null
          observacao: string | null
          periodo: string
          voluntario_id: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          periodo?: string
          voluntario_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          periodo?: string
          voluntario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indisponibilidades_voluntario_id_fkey"
            columns: ["voluntario_id"]
            isOneToOne: false
            referencedRelation: "voluntarios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          celular: string | null
          created_at: string
          id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso_tipo"]
          nome: string
          sobrenome: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          celular?: string | null
          created_at?: string
          id: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso_tipo"]
          nome: string
          sobrenome?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          celular?: string | null
          created_at?: string
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso_tipo"]
          nome?: string
          sobrenome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tipos_culto: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          dia_semana: number
          horario: string
          id: string
          meses_intervalo: number | null
          nome: string
          periodo: string
          semana_mes: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          dia_semana: number
          horario: string
          id?: string
          meses_intervalo?: number | null
          nome: string
          periodo: string
          semana_mes?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          dia_semana?: number
          horario?: string
          id?: string
          meses_intervalo?: number | null
          nome?: string
          periodo?: string
          semana_mes?: number | null
        }
        Relationships: []
      }
      voluntario_funcoes: {
        Row: {
          funcao_id: string
          voluntario_id: string
        }
        Insert: {
          funcao_id: string
          voluntario_id: string
        }
        Update: {
          funcao_id?: string
          voluntario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voluntario_funcoes_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voluntario_funcoes_voluntario_id_fkey"
            columns: ["voluntario_id"]
            isOneToOne: false
            referencedRelation: "voluntarios"
            referencedColumns: ["id"]
          },
        ]
      }
      voluntarios: {
        Row: {
          ativo: boolean
          celular: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          sobrenome: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          celular?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          sobrenome?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          celular?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          sobrenome?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_usuario_admin: {
        Args: {
          p_email: string
          p_nivel_acesso: string
          p_nome: string
          p_password: string
          p_sobrenome: string
        }
        Returns: Json
      }
      deletar_usuario_admin: { Args: { p_user_id: string }; Returns: Json }
      get_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      nivel_acesso_tipo: "admin" | "lider" | "voluntario"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      nivel_acesso_tipo: ["admin", "lider", "voluntario"],
    },
  },
} as const
