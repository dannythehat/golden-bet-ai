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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acca_history: {
        Row: {
          average_confidence: number
          combined_odds: number
          created_at: string
          gaffer_reasoning: string
          id: string
          legs_lost: number | null
          legs_won: number | null
          prediction_date: string
          profit_loss: number | null
          proof_captured_at: string | null
          proof_screenshot_url: string | null
          results: Json | null
          selection_count: number
          selections: Json
          settled_at: string | null
          stake: number | null
          status: string
        }
        Insert: {
          average_confidence: number
          combined_odds: number
          created_at?: string
          gaffer_reasoning: string
          id?: string
          legs_lost?: number | null
          legs_won?: number | null
          prediction_date?: string
          profit_loss?: number | null
          proof_captured_at?: string | null
          proof_screenshot_url?: string | null
          results?: Json | null
          selection_count?: number
          selections?: Json
          settled_at?: string | null
          stake?: number | null
          status?: string
        }
        Update: {
          average_confidence?: number
          combined_odds?: number
          created_at?: string
          gaffer_reasoning?: string
          id?: string
          legs_lost?: number | null
          legs_won?: number | null
          prediction_date?: string
          profit_loss?: number | null
          proof_captured_at?: string | null
          proof_screenshot_url?: string | null
          results?: Json | null
          selection_count?: number
          selections?: Json
          settled_at?: string | null
          stake?: number | null
          status?: string
        }
        Relationships: []
      }
      alert_preferences: {
        Row: {
          alert_btts: boolean
          alert_cards: boolean
          alert_corners: boolean
          alert_goals: boolean
          cards_threshold: number | null
          corners_threshold: number | null
          created_at: string
          email_enabled: boolean
          goals_threshold: number | null
          id: string
          is_active: boolean
          last_notified_at: string | null
          push_enabled: boolean
          saved_fixture_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alert_btts?: boolean
          alert_cards?: boolean
          alert_corners?: boolean
          alert_goals?: boolean
          cards_threshold?: number | null
          corners_threshold?: number | null
          created_at?: string
          email_enabled?: boolean
          goals_threshold?: number | null
          id?: string
          is_active?: boolean
          last_notified_at?: string | null
          push_enabled?: boolean
          saved_fixture_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alert_btts?: boolean
          alert_cards?: boolean
          alert_corners?: boolean
          alert_goals?: boolean
          cards_threshold?: number | null
          corners_threshold?: number | null
          created_at?: string
          email_enabled?: boolean
          goals_threshold?: number | null
          id?: string
          is_active?: boolean
          last_notified_at?: string | null
          push_enabled?: boolean
          saved_fixture_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_preferences_saved_fixture_id_fkey"
            columns: ["saved_fixture_id"]
            isOneToOne: false
            referencedRelation: "saved_fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      backfill_stats_log: {
        Row: {
          api_hit_rate: number | null
          batch_size: number | null
          cards_total: number | null
          corners_total: number | null
          enriched: number | null
          errors: number | null
          from_date: string | null
          id: string
          leagues_hit: Json | null
          mode: string
          no_data: number | null
          rate_limits: number | null
          run_at: string
          run_id: string
          targeted: number | null
          to_date: string | null
        }
        Insert: {
          api_hit_rate?: number | null
          batch_size?: number | null
          cards_total?: number | null
          corners_total?: number | null
          enriched?: number | null
          errors?: number | null
          from_date?: string | null
          id?: string
          leagues_hit?: Json | null
          mode?: string
          no_data?: number | null
          rate_limits?: number | null
          run_at?: string
          run_id: string
          targeted?: number | null
          to_date?: string | null
        }
        Update: {
          api_hit_rate?: number | null
          batch_size?: number | null
          cards_total?: number | null
          corners_total?: number | null
          enriched?: number | null
          errors?: number | null
          from_date?: string | null
          id?: string
          leagues_hit?: Json | null
          mode?: string
          no_data?: number | null
          rate_limits?: number | null
          run_at?: string
          run_id?: string
          targeted?: number | null
          to_date?: string | null
        }
        Relationships: []
      }
      bet_builder_history: {
        Row: {
          actual_cards: number | null
          actual_corners: number | null
          actual_goals_away: number | null
          actual_goals_home: number | null
          average_confidence: number
          average_confidence_raw: number | null
          away_team: string
          btts_result: boolean | null
          combined_odds: number
          created_at: string
          fixture_id: string
          gaffer_reasoning: string
          home_team: string
          id: string
          kickoff: string
          league: string
          market_confidences: Json
          market_confidences_raw: Json | null
          markets: string[]
          prediction_date: string
          profit_loss: number | null
          proof_captured_at: string | null
          proof_screenshot_url: string | null
          result: string | null
          settled_at: string | null
          stake: number | null
          status: string
        }
        Insert: {
          actual_cards?: number | null
          actual_corners?: number | null
          actual_goals_away?: number | null
          actual_goals_home?: number | null
          average_confidence: number
          average_confidence_raw?: number | null
          away_team: string
          btts_result?: boolean | null
          combined_odds: number
          created_at?: string
          fixture_id: string
          gaffer_reasoning: string
          home_team: string
          id?: string
          kickoff: string
          league: string
          market_confidences?: Json
          market_confidences_raw?: Json | null
          markets: string[]
          prediction_date?: string
          profit_loss?: number | null
          proof_captured_at?: string | null
          proof_screenshot_url?: string | null
          result?: string | null
          settled_at?: string | null
          stake?: number | null
          status?: string
        }
        Update: {
          actual_cards?: number | null
          actual_corners?: number | null
          actual_goals_away?: number | null
          actual_goals_home?: number | null
          average_confidence?: number
          average_confidence_raw?: number | null
          away_team?: string
          btts_result?: boolean | null
          combined_odds?: number
          created_at?: string
          fixture_id?: string
          gaffer_reasoning?: string
          home_team?: string
          id?: string
          kickoff?: string
          league?: string
          market_confidences?: Json
          market_confidences_raw?: Json | null
          markets?: string[]
          prediction_date?: string
          profit_loss?: number | null
          proof_captured_at?: string | null
          proof_screenshot_url?: string | null
          result?: string | null
          settled_at?: string | null
          stake?: number | null
          status?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          excerpt: string
          hero_image_url: string | null
          id: string
          is_published: boolean
          post_type: string
          published_at: string | null
          reading_time_minutes: number | null
          related_fixture_id: string | null
          related_prediction_date: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content: string
          created_at?: string
          excerpt: string
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          post_type?: string
          published_at?: string | null
          reading_time_minutes?: number | null
          related_fixture_id?: string | null
          related_prediction_date?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          post_type?: string
          published_at?: string | null
          reading_time_minutes?: number | null
          related_fixture_id?: string | null
          related_prediction_date?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenge_log: {
        Row: {
          acca_id: string | null
          balance_proof_url: string | null
          bet_builder_ids: string[] | null
          bets_lost: number | null
          bets_proof_url: string | null
          bets_total: number | null
          bets_won: number | null
          challenge_date: string
          closing_balance: number | null
          created_at: string
          day_number: number
          gaffer_commentary: string | null
          golden_bet_ids: string[] | null
          id: string
          morning_article_slug: string | null
          profit_loss: number | null
          results_article_slug: string | null
          results_proof_url: string | null
          stake_amount: number
          stake_percentage: number
          starting_balance: number
          status: string
          total_returns: number | null
          updated_at: string
        }
        Insert: {
          acca_id?: string | null
          balance_proof_url?: string | null
          bet_builder_ids?: string[] | null
          bets_lost?: number | null
          bets_proof_url?: string | null
          bets_total?: number | null
          bets_won?: number | null
          challenge_date?: string
          closing_balance?: number | null
          created_at?: string
          day_number: number
          gaffer_commentary?: string | null
          golden_bet_ids?: string[] | null
          id?: string
          morning_article_slug?: string | null
          profit_loss?: number | null
          results_article_slug?: string | null
          results_proof_url?: string | null
          stake_amount?: number
          stake_percentage?: number
          starting_balance?: number
          status?: string
          total_returns?: number | null
          updated_at?: string
        }
        Update: {
          acca_id?: string | null
          balance_proof_url?: string | null
          bet_builder_ids?: string[] | null
          bets_lost?: number | null
          bets_proof_url?: string | null
          bets_total?: number | null
          bets_won?: number | null
          challenge_date?: string
          closing_balance?: number | null
          created_at?: string
          day_number?: number
          gaffer_commentary?: string | null
          golden_bet_ids?: string[] | null
          id?: string
          morning_article_slug?: string | null
          profit_loss?: number | null
          results_article_slug?: string | null
          results_proof_url?: string | null
          stake_amount?: number
          stake_percentage?: number
          starting_balance?: number
          status?: string
          total_returns?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dim_referee: {
        Row: {
          cards_per_match: number | null
          collision_reason: string | null
          collision_suspected: boolean
          created_at: string
          fouls_per_match: number | null
          last_updated: string
          matches_count: number
          pens_per_match: number | null
          referee_key: string
          referee_name_raw: string
        }
        Insert: {
          cards_per_match?: number | null
          collision_reason?: string | null
          collision_suspected?: boolean
          created_at?: string
          fouls_per_match?: number | null
          last_updated?: string
          matches_count?: number
          pens_per_match?: number | null
          referee_key: string
          referee_name_raw: string
        }
        Update: {
          cards_per_match?: number | null
          collision_reason?: string | null
          collision_suspected?: boolean
          created_at?: string
          fouls_per_match?: number | null
          last_updated?: string
          matches_count?: number
          pens_per_match?: number | null
          referee_key?: string
          referee_name_raw?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string
          id: string
          new_bets_enabled: boolean
          settlement_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_bets_enabled?: boolean
          settlement_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_bets_enabled?: boolean
          settlement_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gaffer_alerts: {
        Row: {
          actual_outcome: string | null
          alert_type: string
          away_success_pct: number | null
          away_team: string
          combined_confidence: number | null
          created_at: string
          fixture_date: string
          fixture_id: string
          gaffer_alert_text: string | null
          home_success_pct: number | null
          home_team: string
          id: string
          is_active: boolean | null
          kickoff: string
          league: string
          market: string
          result: string | null
          settled_at: string | null
        }
        Insert: {
          actual_outcome?: string | null
          alert_type: string
          away_success_pct?: number | null
          away_team: string
          combined_confidence?: number | null
          created_at?: string
          fixture_date: string
          fixture_id: string
          gaffer_alert_text?: string | null
          home_success_pct?: number | null
          home_team: string
          id?: string
          is_active?: boolean | null
          kickoff: string
          league: string
          market: string
          result?: string | null
          settled_at?: string | null
        }
        Update: {
          actual_outcome?: string | null
          alert_type?: string
          away_success_pct?: number | null
          away_team?: string
          combined_confidence?: number | null
          created_at?: string
          fixture_date?: string
          fixture_id?: string
          gaffer_alert_text?: string | null
          home_success_pct?: number | null
          home_team?: string
          id?: string
          is_active?: boolean | null
          kickoff?: string
          league?: string
          market?: string
          result?: string | null
          settled_at?: string | null
        }
        Relationships: []
      }
      gaffer_learning_log: {
        Row: {
          actual_value: number | null
          away_team: string
          bookmaker_odds: number | null
          created_at: string | null
          derby_boost: number | null
          fixture_id: string
          h2h_pct: number | null
          home_team: string
          id: string
          intelligence_adj: number | null
          league: string
          league_avg: number | null
          market: string
          overall_pct: number | null
          predicted_probability: number
          prediction_date: string
          probability_band: string
          result: string | null
          settled_at: string | null
          source: string
          value_edge: number | null
          venue_pct: number | null
        }
        Insert: {
          actual_value?: number | null
          away_team: string
          bookmaker_odds?: number | null
          created_at?: string | null
          derby_boost?: number | null
          fixture_id: string
          h2h_pct?: number | null
          home_team: string
          id?: string
          intelligence_adj?: number | null
          league: string
          league_avg?: number | null
          market: string
          overall_pct?: number | null
          predicted_probability: number
          prediction_date?: string
          probability_band: string
          result?: string | null
          settled_at?: string | null
          source?: string
          value_edge?: number | null
          venue_pct?: number | null
        }
        Update: {
          actual_value?: number | null
          away_team?: string
          bookmaker_odds?: number | null
          created_at?: string | null
          derby_boost?: number | null
          fixture_id?: string
          h2h_pct?: number | null
          home_team?: string
          id?: string
          intelligence_adj?: number | null
          league?: string
          league_avg?: number | null
          market?: string
          overall_pct?: number | null
          predicted_probability?: number
          prediction_date?: string
          probability_band?: string
          result?: string | null
          settled_at?: string | null
          source?: string
          value_edge?: number | null
          venue_pct?: number | null
        }
        Relationships: []
      }
      golden_bet_history: {
        Row: {
          actual_goals_away: number | null
          actual_goals_home: number | null
          away_team: string
          bookmaker_odds: number | null
          created_at: string
          fixture_id: string
          gaffer_reasoning: string
          home_team: string
          id: string
          kickoff: string
          league: string
          market: string
          ml_confidence: number
          ml_confidence_raw: number | null
          prediction_date: string
          profit_loss: number | null
          proof_captured_at: string | null
          proof_screenshot_url: string | null
          result: string | null
          settled_at: string | null
          stake: number | null
          status: string
          value_edge: number
        }
        Insert: {
          actual_goals_away?: number | null
          actual_goals_home?: number | null
          away_team: string
          bookmaker_odds?: number | null
          created_at?: string
          fixture_id: string
          gaffer_reasoning: string
          home_team: string
          id?: string
          kickoff: string
          league: string
          market: string
          ml_confidence: number
          ml_confidence_raw?: number | null
          prediction_date?: string
          profit_loss?: number | null
          proof_captured_at?: string | null
          proof_screenshot_url?: string | null
          result?: string | null
          settled_at?: string | null
          stake?: number | null
          status?: string
          value_edge: number
        }
        Update: {
          actual_goals_away?: number | null
          actual_goals_home?: number | null
          away_team?: string
          bookmaker_odds?: number | null
          created_at?: string
          fixture_id?: string
          gaffer_reasoning?: string
          home_team?: string
          id?: string
          kickoff?: string
          league?: string
          market?: string
          ml_confidence?: number
          ml_confidence_raw?: number | null
          prediction_date?: string
          profit_loss?: number | null
          proof_captured_at?: string | null
          proof_screenshot_url?: string | null
          result?: string | null
          settled_at?: string | null
          stake?: number | null
          status?: string
          value_edge?: number
        }
        Relationships: []
      }
      league_rolling_stats: {
        Row: {
          avg_away_cards: number | null
          avg_away_corners: number | null
          avg_away_goals: number | null
          avg_home_cards: number | null
          avg_home_corners: number | null
          avg_home_goals: number | null
          avg_total_cards: number | null
          avg_total_corners: number | null
          avg_total_goals: number | null
          away_scored_pct: number | null
          btts_pct: number | null
          clean_sheet_pct: number | null
          created_at: string | null
          home_scored_pct: number | null
          id: string
          last_updated: string | null
          league: string
          league_id: number | null
          matches_sampled: number
          over_105_corners_pct: number | null
          over_15_goals_pct: number | null
          over_25_cards_pct: number | null
          over_25_goals_pct: number | null
          over_35_cards_pct: number | null
          over_35_goals_pct: number | null
          over_45_cards_pct: number | null
          over_85_corners_pct: number | null
          over_95_corners_pct: number | null
          region: string
        }
        Insert: {
          avg_away_cards?: number | null
          avg_away_corners?: number | null
          avg_away_goals?: number | null
          avg_home_cards?: number | null
          avg_home_corners?: number | null
          avg_home_goals?: number | null
          avg_total_cards?: number | null
          avg_total_corners?: number | null
          avg_total_goals?: number | null
          away_scored_pct?: number | null
          btts_pct?: number | null
          clean_sheet_pct?: number | null
          created_at?: string | null
          home_scored_pct?: number | null
          id?: string
          last_updated?: string | null
          league: string
          league_id?: number | null
          matches_sampled?: number
          over_105_corners_pct?: number | null
          over_15_goals_pct?: number | null
          over_25_cards_pct?: number | null
          over_25_goals_pct?: number | null
          over_35_cards_pct?: number | null
          over_35_goals_pct?: number | null
          over_45_cards_pct?: number | null
          over_85_corners_pct?: number | null
          over_95_corners_pct?: number | null
          region?: string
        }
        Update: {
          avg_away_cards?: number | null
          avg_away_corners?: number | null
          avg_away_goals?: number | null
          avg_home_cards?: number | null
          avg_home_corners?: number | null
          avg_home_goals?: number | null
          avg_total_cards?: number | null
          avg_total_corners?: number | null
          avg_total_goals?: number | null
          away_scored_pct?: number | null
          btts_pct?: number | null
          clean_sheet_pct?: number | null
          created_at?: string | null
          home_scored_pct?: number | null
          id?: string
          last_updated?: string | null
          league?: string
          league_id?: number | null
          matches_sampled?: number
          over_105_corners_pct?: number | null
          over_15_goals_pct?: number | null
          over_25_cards_pct?: number | null
          over_25_goals_pct?: number | null
          over_35_cards_pct?: number | null
          over_35_goals_pct?: number | null
          over_45_cards_pct?: number | null
          over_85_corners_pct?: number | null
          over_95_corners_pct?: number | null
          region?: string
        }
        Relationships: []
      }
      market_edge_profile: {
        Row: {
          avg_bookmaker_implied_prob: number | null
          avg_model_prob: number | null
          created_at: string | null
          edge_strength_score: number | null
          historical_hit_rate: number | null
          hit_count: number
          id: string
          last_updated: string | null
          market: string
          model_prob_mid: number
          prob_band: string
          roi: number | null
          sample_count: number
        }
        Insert: {
          avg_bookmaker_implied_prob?: number | null
          avg_model_prob?: number | null
          created_at?: string | null
          edge_strength_score?: number | null
          historical_hit_rate?: number | null
          hit_count?: number
          id?: string
          last_updated?: string | null
          market: string
          model_prob_mid: number
          prob_band: string
          roi?: number | null
          sample_count?: number
        }
        Update: {
          avg_bookmaker_implied_prob?: number | null
          avg_model_prob?: number | null
          created_at?: string | null
          edge_strength_score?: number | null
          historical_hit_rate?: number | null
          hit_count?: number
          id?: string
          last_updated?: string | null
          market?: string
          model_prob_mid?: number
          prob_band?: string
          roi?: number | null
          sample_count?: number
        }
        Relationships: []
      }
      match_intelligence: {
        Row: {
          away_days_since_last_match: number | null
          away_injuries: Json | null
          away_injuries_detailed: Json | null
          away_injury_count: number | null
          away_is_fatigued: boolean | null
          away_key_players_out: string[] | null
          away_manager: string | null
          away_manager_games: number | null
          away_matches_last_14_days: number | null
          away_new_manager: boolean | null
          away_team: string
          away_travel_km_last_14_days: number | null
          created_at: string
          fatigue_risk_score: number | null
          fixture_date: string
          fixture_id: string
          gaffer_talking_points: string[] | null
          home_days_since_last_match: number | null
          home_injuries: Json | null
          home_injuries_detailed: Json | null
          home_injury_count: number | null
          home_is_fatigued: boolean | null
          home_key_players_out: string[] | null
          home_manager: string | null
          home_manager_games: number | null
          home_matches_last_14_days: number | null
          home_new_manager: boolean | null
          home_team: string
          home_travel_km_last_14_days: number | null
          humidity_percent: number | null
          id: string
          injury_risk_score: number | null
          intelligence_summary: string | null
          is_adverse_weather: boolean | null
          is_early_kickoff: boolean | null
          kickoff: string
          kickoff_hour: number | null
          league: string
          overall_risk_score: number | null
          referee_avg_cards: number | null
          referee_avg_fouls: number | null
          referee_name: string | null
          referee_strictness: string | null
          rejection_reasons: string[] | null
          should_avoid: boolean | null
          temperature_celsius: number | null
          updated_at: string
          weather_condition: string | null
          weather_humidity: number | null
          weather_impact: string[] | null
          weather_rain_chance: number | null
          weather_risk_score: number | null
          weather_temp_celsius: number | null
          weather_wind_speed_kmh: number | null
          wind_speed_kmh: number | null
        }
        Insert: {
          away_days_since_last_match?: number | null
          away_injuries?: Json | null
          away_injuries_detailed?: Json | null
          away_injury_count?: number | null
          away_is_fatigued?: boolean | null
          away_key_players_out?: string[] | null
          away_manager?: string | null
          away_manager_games?: number | null
          away_matches_last_14_days?: number | null
          away_new_manager?: boolean | null
          away_team: string
          away_travel_km_last_14_days?: number | null
          created_at?: string
          fatigue_risk_score?: number | null
          fixture_date: string
          fixture_id: string
          gaffer_talking_points?: string[] | null
          home_days_since_last_match?: number | null
          home_injuries?: Json | null
          home_injuries_detailed?: Json | null
          home_injury_count?: number | null
          home_is_fatigued?: boolean | null
          home_key_players_out?: string[] | null
          home_manager?: string | null
          home_manager_games?: number | null
          home_matches_last_14_days?: number | null
          home_new_manager?: boolean | null
          home_team: string
          home_travel_km_last_14_days?: number | null
          humidity_percent?: number | null
          id?: string
          injury_risk_score?: number | null
          intelligence_summary?: string | null
          is_adverse_weather?: boolean | null
          is_early_kickoff?: boolean | null
          kickoff: string
          kickoff_hour?: number | null
          league: string
          overall_risk_score?: number | null
          referee_avg_cards?: number | null
          referee_avg_fouls?: number | null
          referee_name?: string | null
          referee_strictness?: string | null
          rejection_reasons?: string[] | null
          should_avoid?: boolean | null
          temperature_celsius?: number | null
          updated_at?: string
          weather_condition?: string | null
          weather_humidity?: number | null
          weather_impact?: string[] | null
          weather_rain_chance?: number | null
          weather_risk_score?: number | null
          weather_temp_celsius?: number | null
          weather_wind_speed_kmh?: number | null
          wind_speed_kmh?: number | null
        }
        Update: {
          away_days_since_last_match?: number | null
          away_injuries?: Json | null
          away_injuries_detailed?: Json | null
          away_injury_count?: number | null
          away_is_fatigued?: boolean | null
          away_key_players_out?: string[] | null
          away_manager?: string | null
          away_manager_games?: number | null
          away_matches_last_14_days?: number | null
          away_new_manager?: boolean | null
          away_team?: string
          away_travel_km_last_14_days?: number | null
          created_at?: string
          fatigue_risk_score?: number | null
          fixture_date?: string
          fixture_id?: string
          gaffer_talking_points?: string[] | null
          home_days_since_last_match?: number | null
          home_injuries?: Json | null
          home_injuries_detailed?: Json | null
          home_injury_count?: number | null
          home_is_fatigued?: boolean | null
          home_key_players_out?: string[] | null
          home_manager?: string | null
          home_manager_games?: number | null
          home_matches_last_14_days?: number | null
          home_new_manager?: boolean | null
          home_team?: string
          home_travel_km_last_14_days?: number | null
          humidity_percent?: number | null
          id?: string
          injury_risk_score?: number | null
          intelligence_summary?: string | null
          is_adverse_weather?: boolean | null
          is_early_kickoff?: boolean | null
          kickoff?: string
          kickoff_hour?: number | null
          league?: string
          overall_risk_score?: number | null
          referee_avg_cards?: number | null
          referee_avg_fouls?: number | null
          referee_name?: string | null
          referee_strictness?: string | null
          rejection_reasons?: string[] | null
          should_avoid?: boolean | null
          temperature_celsius?: number | null
          updated_at?: string
          weather_condition?: string | null
          weather_humidity?: number | null
          weather_impact?: string[] | null
          weather_rain_chance?: number | null
          weather_risk_score?: number | null
          weather_temp_celsius?: number | null
          weather_wind_speed_kmh?: number | null
          wind_speed_kmh?: number | null
        }
        Relationships: []
      }
      match_power_scores: {
        Row: {
          away_team: string
          best_market: string | null
          best_score: number | null
          btts_score: number | null
          computed_date: string
          created_at: string
          fixture_id: string
          home_team: string
          id: string
          kickoff: string | null
          league: string
          over_25_goals_score: number | null
          over_35_cards_score: number | null
          over_95_corners_score: number | null
          score_breakdown: Json | null
        }
        Insert: {
          away_team: string
          best_market?: string | null
          best_score?: number | null
          btts_score?: number | null
          computed_date?: string
          created_at?: string
          fixture_id: string
          home_team: string
          id?: string
          kickoff?: string | null
          league: string
          over_25_goals_score?: number | null
          over_35_cards_score?: number | null
          over_95_corners_score?: number | null
          score_breakdown?: Json | null
        }
        Update: {
          away_team?: string
          best_market?: string | null
          best_score?: number | null
          btts_score?: number | null
          computed_date?: string
          created_at?: string
          fixture_id?: string
          home_team?: string
          id?: string
          kickoff?: string | null
          league?: string
          over_25_goals_score?: number | null
          over_35_cards_score?: number | null
          over_95_corners_score?: number | null
          score_breakdown?: Json | null
        }
        Relationships: []
      }
      ml_intelligence_log: {
        Row: {
          ai_adjusted_probability: number | null
          ai_adjustment: number | null
          ai_confidence: string | null
          ai_reasoning: string | null
          away_team: string
          context_factors: Json | null
          created_at: string
          fixture_id: string
          home_team: string
          id: string
          league: string
          market: string
          ml_probability: number
        }
        Insert: {
          ai_adjusted_probability?: number | null
          ai_adjustment?: number | null
          ai_confidence?: string | null
          ai_reasoning?: string | null
          away_team: string
          context_factors?: Json | null
          created_at?: string
          fixture_id: string
          home_team: string
          id?: string
          league: string
          market: string
          ml_probability: number
        }
        Update: {
          ai_adjusted_probability?: number | null
          ai_adjustment?: number | null
          ai_confidence?: string | null
          ai_reasoning?: string | null
          away_team?: string
          context_factors?: Json | null
          created_at?: string
          fixture_id?: string
          home_team?: string
          id?: string
          league?: string
          market?: string
          ml_probability?: number
        }
        Relationships: []
      }
      ml_model_accuracy: {
        Row: {
          avg_confidence: number | null
          best_streak: number | null
          correct_predictions: number | null
          created_at: string
          current_streak: number | null
          date: string
          id: string
          league_cluster: string | null
          market: string
          ml_probability: number | null
          model_type: string | null
          odds: number | null
          profit_loss: number | null
          roi: number | null
          total_predictions: number | null
          total_returns: number | null
          total_staked: number | null
          updated_at: string
          win_rate: number | null
        }
        Insert: {
          avg_confidence?: number | null
          best_streak?: number | null
          correct_predictions?: number | null
          created_at?: string
          current_streak?: number | null
          date?: string
          id?: string
          league_cluster?: string | null
          market: string
          ml_probability?: number | null
          model_type?: string | null
          odds?: number | null
          profit_loss?: number | null
          roi?: number | null
          total_predictions?: number | null
          total_returns?: number | null
          total_staked?: number | null
          updated_at?: string
          win_rate?: number | null
        }
        Update: {
          avg_confidence?: number | null
          best_streak?: number | null
          correct_predictions?: number | null
          created_at?: string
          current_streak?: number | null
          date?: string
          id?: string
          league_cluster?: string | null
          market?: string
          ml_probability?: number | null
          model_type?: string | null
          odds?: number | null
          profit_loss?: number | null
          roi?: number | null
          total_predictions?: number | null
          total_returns?: number | null
          total_staked?: number | null
          updated_at?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      ml_models: {
        Row: {
          accuracy: number | null
          auc_roc: number | null
          brier_score: number | null
          calibration_intercept: number | null
          calibration_method: string | null
          calibration_slope: number | null
          ev_vs_bookmaker: number | null
          f1_score: number | null
          false_negatives: number | null
          false_positives: number | null
          feature_names: Json
          features_used: number
          id: string
          is_active: boolean | null
          market: string
          model_confidence_score: number | null
          model_type: string
          precision_score: number | null
          recall_score: number | null
          reliability_bins: Json | null
          rows_used: number | null
          test_samples: number
          training_date: string | null
          training_samples: number
          true_negatives: number | null
          true_positives: number | null
          version: number
          weights: Json
        }
        Insert: {
          accuracy?: number | null
          auc_roc?: number | null
          brier_score?: number | null
          calibration_intercept?: number | null
          calibration_method?: string | null
          calibration_slope?: number | null
          ev_vs_bookmaker?: number | null
          f1_score?: number | null
          false_negatives?: number | null
          false_positives?: number | null
          feature_names?: Json
          features_used: number
          id?: string
          is_active?: boolean | null
          market: string
          model_confidence_score?: number | null
          model_type?: string
          precision_score?: number | null
          recall_score?: number | null
          reliability_bins?: Json | null
          rows_used?: number | null
          test_samples: number
          training_date?: string | null
          training_samples: number
          true_negatives?: number | null
          true_positives?: number | null
          version?: number
          weights?: Json
        }
        Update: {
          accuracy?: number | null
          auc_roc?: number | null
          brier_score?: number | null
          calibration_intercept?: number | null
          calibration_method?: string | null
          calibration_slope?: number | null
          ev_vs_bookmaker?: number | null
          f1_score?: number | null
          false_negatives?: number | null
          false_positives?: number | null
          feature_names?: Json
          features_used?: number
          id?: string
          is_active?: boolean | null
          market?: string
          model_confidence_score?: number | null
          model_type?: string
          precision_score?: number | null
          recall_score?: number | null
          reliability_bins?: Json | null
          rows_used?: number | null
          test_samples?: number
          training_date?: string | null
          training_samples?: number
          true_negatives?: number | null
          true_positives?: number | null
          version?: number
          weights?: Json
        }
        Relationships: []
      }
      ml_training_data: {
        Row: {
          away_avg_cards: number | null
          away_avg_corners: number | null
          away_avg_goals: number | null
          away_blocked_shots: number | null
          away_btts_pct: number | null
          away_corners: number | null
          away_form: string | null
          away_fouls: number | null
          away_goalkeeper_saves: number | null
          away_goals: number | null
          away_offsides: number | null
          away_over25_pct: number | null
          away_over35_cards_pct: number | null
          away_over95_corners_pct: number | null
          away_passes_accurate: number | null
          away_passes_pct: string | null
          away_possession: string | null
          away_red_cards: number | null
          away_shots_insidebox: number | null
          away_shots_off_goal: number | null
          away_shots_on_goal: number | null
          away_shots_outsidebox: number | null
          away_team: string
          away_total_passes: number | null
          away_total_shots: number | null
          away_xg: number | null
          away_yellow_cards: number | null
          btts_hit: boolean | null
          created_at: string
          fixture_date: string
          fixture_id: string
          home_avg_cards: number | null
          home_avg_corners: number | null
          home_avg_goals: number | null
          home_blocked_shots: number | null
          home_btts_pct: number | null
          home_corners: number | null
          home_form: string | null
          home_fouls: number | null
          home_goalkeeper_saves: number | null
          home_goals: number | null
          home_offsides: number | null
          home_over25_pct: number | null
          home_over35_cards_pct: number | null
          home_over95_corners_pct: number | null
          home_passes_accurate: number | null
          home_passes_pct: string | null
          home_possession: string | null
          home_red_cards: number | null
          home_shots_insidebox: number | null
          home_shots_off_goal: number | null
          home_shots_on_goal: number | null
          home_shots_outsidebox: number | null
          home_team: string
          home_total_passes: number | null
          home_total_shots: number | null
          home_xg: number | null
          home_yellow_cards: number | null
          id: string
          league: string
          over_25_hit: boolean | null
          over_35_cards_hit: boolean | null
          over_95_corners_hit: boolean | null
          referee_key: string | null
          region: string
          total_cards: number | null
          total_corners: number | null
          total_goals: number | null
        }
        Insert: {
          away_avg_cards?: number | null
          away_avg_corners?: number | null
          away_avg_goals?: number | null
          away_blocked_shots?: number | null
          away_btts_pct?: number | null
          away_corners?: number | null
          away_form?: string | null
          away_fouls?: number | null
          away_goalkeeper_saves?: number | null
          away_goals?: number | null
          away_offsides?: number | null
          away_over25_pct?: number | null
          away_over35_cards_pct?: number | null
          away_over95_corners_pct?: number | null
          away_passes_accurate?: number | null
          away_passes_pct?: string | null
          away_possession?: string | null
          away_red_cards?: number | null
          away_shots_insidebox?: number | null
          away_shots_off_goal?: number | null
          away_shots_on_goal?: number | null
          away_shots_outsidebox?: number | null
          away_team: string
          away_total_passes?: number | null
          away_total_shots?: number | null
          away_xg?: number | null
          away_yellow_cards?: number | null
          btts_hit?: boolean | null
          created_at?: string
          fixture_date: string
          fixture_id: string
          home_avg_cards?: number | null
          home_avg_corners?: number | null
          home_avg_goals?: number | null
          home_blocked_shots?: number | null
          home_btts_pct?: number | null
          home_corners?: number | null
          home_form?: string | null
          home_fouls?: number | null
          home_goalkeeper_saves?: number | null
          home_goals?: number | null
          home_offsides?: number | null
          home_over25_pct?: number | null
          home_over35_cards_pct?: number | null
          home_over95_corners_pct?: number | null
          home_passes_accurate?: number | null
          home_passes_pct?: string | null
          home_possession?: string | null
          home_red_cards?: number | null
          home_shots_insidebox?: number | null
          home_shots_off_goal?: number | null
          home_shots_on_goal?: number | null
          home_shots_outsidebox?: number | null
          home_team: string
          home_total_passes?: number | null
          home_total_shots?: number | null
          home_xg?: number | null
          home_yellow_cards?: number | null
          id?: string
          league: string
          over_25_hit?: boolean | null
          over_35_cards_hit?: boolean | null
          over_95_corners_hit?: boolean | null
          referee_key?: string | null
          region?: string
          total_cards?: number | null
          total_corners?: number | null
          total_goals?: number | null
        }
        Update: {
          away_avg_cards?: number | null
          away_avg_corners?: number | null
          away_avg_goals?: number | null
          away_blocked_shots?: number | null
          away_btts_pct?: number | null
          away_corners?: number | null
          away_form?: string | null
          away_fouls?: number | null
          away_goalkeeper_saves?: number | null
          away_goals?: number | null
          away_offsides?: number | null
          away_over25_pct?: number | null
          away_over35_cards_pct?: number | null
          away_over95_corners_pct?: number | null
          away_passes_accurate?: number | null
          away_passes_pct?: string | null
          away_possession?: string | null
          away_red_cards?: number | null
          away_shots_insidebox?: number | null
          away_shots_off_goal?: number | null
          away_shots_on_goal?: number | null
          away_shots_outsidebox?: number | null
          away_team?: string
          away_total_passes?: number | null
          away_total_shots?: number | null
          away_xg?: number | null
          away_yellow_cards?: number | null
          btts_hit?: boolean | null
          created_at?: string
          fixture_date?: string
          fixture_id?: string
          home_avg_cards?: number | null
          home_avg_corners?: number | null
          home_avg_goals?: number | null
          home_blocked_shots?: number | null
          home_btts_pct?: number | null
          home_corners?: number | null
          home_form?: string | null
          home_fouls?: number | null
          home_goalkeeper_saves?: number | null
          home_goals?: number | null
          home_offsides?: number | null
          home_over25_pct?: number | null
          home_over35_cards_pct?: number | null
          home_over95_corners_pct?: number | null
          home_passes_accurate?: number | null
          home_passes_pct?: string | null
          home_possession?: string | null
          home_red_cards?: number | null
          home_shots_insidebox?: number | null
          home_shots_off_goal?: number | null
          home_shots_on_goal?: number | null
          home_shots_outsidebox?: number | null
          home_team?: string
          home_total_passes?: number | null
          home_total_shots?: number | null
          home_xg?: number | null
          home_yellow_cards?: number | null
          id?: string
          league?: string
          over_25_hit?: boolean | null
          over_35_cards_hit?: boolean | null
          over_95_corners_hit?: boolean | null
          referee_key?: string | null
          region?: string
          total_cards?: number | null
          total_corners?: number | null
          total_goals?: number | null
        }
        Relationships: []
      }
      ml_training_data_v2: {
        Row: {
          away_cards_against_avg_10: number | null
          away_cards_against_avg_20: number | null
          away_cards_against_avg_5: number | null
          away_cards_for_avg_10: number | null
          away_cards_for_avg_20: number | null
          away_cards_for_avg_5: number | null
          away_corners_against_avg_10: number | null
          away_corners_against_avg_20: number | null
          away_corners_against_avg_5: number | null
          away_corners_for_avg_10: number | null
          away_corners_for_avg_20: number | null
          away_corners_for_avg_5: number | null
          away_fouls_for_avg_10: number | null
          away_fouls_for_avg_20: number | null
          away_fouls_for_avg_5: number | null
          away_goals: number | null
          away_goals_against_avg_10: number | null
          away_goals_against_avg_20: number | null
          away_goals_against_avg_5: number | null
          away_goals_for_avg_10: number | null
          away_goals_for_avg_20: number | null
          away_goals_for_avg_5: number | null
          away_shots_for_avg_10: number | null
          away_shots_for_avg_20: number | null
          away_shots_for_avg_5: number | null
          away_shots_on_target_avg_10: number | null
          away_shots_on_target_avg_20: number | null
          away_shots_on_target_avg_5: number | null
          away_team: string
          away_xg_against_avg_10: number | null
          away_xg_against_avg_20: number | null
          away_xg_against_avg_5: number | null
          away_xg_for_avg_10: number | null
          away_xg_for_avg_20: number | null
          away_xg_for_avg_5: number | null
          btts_hit: boolean | null
          combined_cards_10: number | null
          combined_corners_10: number | null
          combined_goals_for_10: number | null
          combined_shots_10: number | null
          combined_xg_for_10: number | null
          created_at: string | null
          defense_weakness_index_10: number | null
          discipline_gap_10: number | null
          features_computed_at: string | null
          fixture_date: string
          fixture_id: string
          fouls_momentum_5: number | null
          home_cards_against_avg_10: number | null
          home_cards_against_avg_20: number | null
          home_cards_against_avg_5: number | null
          home_cards_for_avg_10: number | null
          home_cards_for_avg_20: number | null
          home_cards_for_avg_5: number | null
          home_corners_against_avg_10: number | null
          home_corners_against_avg_20: number | null
          home_corners_against_avg_5: number | null
          home_corners_for_avg_10: number | null
          home_corners_for_avg_20: number | null
          home_corners_for_avg_5: number | null
          home_fouls_for_avg_10: number | null
          home_fouls_for_avg_20: number | null
          home_fouls_for_avg_5: number | null
          home_goals: number | null
          home_goals_against_avg_10: number | null
          home_goals_against_avg_20: number | null
          home_goals_against_avg_5: number | null
          home_goals_for_avg_10: number | null
          home_goals_for_avg_20: number | null
          home_goals_for_avg_5: number | null
          home_shots_for_avg_10: number | null
          home_shots_for_avg_20: number | null
          home_shots_for_avg_5: number | null
          home_shots_on_target_avg_10: number | null
          home_shots_on_target_avg_20: number | null
          home_shots_on_target_avg_5: number | null
          home_team: string
          home_xg_against_avg_10: number | null
          home_xg_against_avg_20: number | null
          home_xg_against_avg_5: number | null
          home_xg_for_avg_10: number | null
          home_xg_for_avg_20: number | null
          home_xg_for_avg_5: number | null
          id: string
          league: string
          league_avg_cards: number | null
          league_avg_corners: number | null
          league_avg_goals: number | null
          league_btts_rate: number | null
          league_over25_rate: number | null
          max_source_match_date: string | null
          over_25_hit: boolean | null
          over_35_cards_hit: boolean | null
          over_95_corners_hit: boolean | null
          ref_avg_cards_last50: number | null
          ref_over35_cards_rate_last50: number | null
          referee_key: string | null
          referee_name: string | null
          region: string
          shot_pressure_10: number | null
          tempo_index_10: number | null
          total_cards: number | null
          total_corners: number | null
          total_goals: number | null
          xg_diff_10: number | null
        }
        Insert: {
          away_cards_against_avg_10?: number | null
          away_cards_against_avg_20?: number | null
          away_cards_against_avg_5?: number | null
          away_cards_for_avg_10?: number | null
          away_cards_for_avg_20?: number | null
          away_cards_for_avg_5?: number | null
          away_corners_against_avg_10?: number | null
          away_corners_against_avg_20?: number | null
          away_corners_against_avg_5?: number | null
          away_corners_for_avg_10?: number | null
          away_corners_for_avg_20?: number | null
          away_corners_for_avg_5?: number | null
          away_fouls_for_avg_10?: number | null
          away_fouls_for_avg_20?: number | null
          away_fouls_for_avg_5?: number | null
          away_goals?: number | null
          away_goals_against_avg_10?: number | null
          away_goals_against_avg_20?: number | null
          away_goals_against_avg_5?: number | null
          away_goals_for_avg_10?: number | null
          away_goals_for_avg_20?: number | null
          away_goals_for_avg_5?: number | null
          away_shots_for_avg_10?: number | null
          away_shots_for_avg_20?: number | null
          away_shots_for_avg_5?: number | null
          away_shots_on_target_avg_10?: number | null
          away_shots_on_target_avg_20?: number | null
          away_shots_on_target_avg_5?: number | null
          away_team: string
          away_xg_against_avg_10?: number | null
          away_xg_against_avg_20?: number | null
          away_xg_against_avg_5?: number | null
          away_xg_for_avg_10?: number | null
          away_xg_for_avg_20?: number | null
          away_xg_for_avg_5?: number | null
          btts_hit?: boolean | null
          combined_cards_10?: number | null
          combined_corners_10?: number | null
          combined_goals_for_10?: number | null
          combined_shots_10?: number | null
          combined_xg_for_10?: number | null
          created_at?: string | null
          defense_weakness_index_10?: number | null
          discipline_gap_10?: number | null
          features_computed_at?: string | null
          fixture_date: string
          fixture_id: string
          fouls_momentum_5?: number | null
          home_cards_against_avg_10?: number | null
          home_cards_against_avg_20?: number | null
          home_cards_against_avg_5?: number | null
          home_cards_for_avg_10?: number | null
          home_cards_for_avg_20?: number | null
          home_cards_for_avg_5?: number | null
          home_corners_against_avg_10?: number | null
          home_corners_against_avg_20?: number | null
          home_corners_against_avg_5?: number | null
          home_corners_for_avg_10?: number | null
          home_corners_for_avg_20?: number | null
          home_corners_for_avg_5?: number | null
          home_fouls_for_avg_10?: number | null
          home_fouls_for_avg_20?: number | null
          home_fouls_for_avg_5?: number | null
          home_goals?: number | null
          home_goals_against_avg_10?: number | null
          home_goals_against_avg_20?: number | null
          home_goals_against_avg_5?: number | null
          home_goals_for_avg_10?: number | null
          home_goals_for_avg_20?: number | null
          home_goals_for_avg_5?: number | null
          home_shots_for_avg_10?: number | null
          home_shots_for_avg_20?: number | null
          home_shots_for_avg_5?: number | null
          home_shots_on_target_avg_10?: number | null
          home_shots_on_target_avg_20?: number | null
          home_shots_on_target_avg_5?: number | null
          home_team: string
          home_xg_against_avg_10?: number | null
          home_xg_against_avg_20?: number | null
          home_xg_against_avg_5?: number | null
          home_xg_for_avg_10?: number | null
          home_xg_for_avg_20?: number | null
          home_xg_for_avg_5?: number | null
          id?: string
          league: string
          league_avg_cards?: number | null
          league_avg_corners?: number | null
          league_avg_goals?: number | null
          league_btts_rate?: number | null
          league_over25_rate?: number | null
          max_source_match_date?: string | null
          over_25_hit?: boolean | null
          over_35_cards_hit?: boolean | null
          over_95_corners_hit?: boolean | null
          ref_avg_cards_last50?: number | null
          ref_over35_cards_rate_last50?: number | null
          referee_key?: string | null
          referee_name?: string | null
          region?: string
          shot_pressure_10?: number | null
          tempo_index_10?: number | null
          total_cards?: number | null
          total_corners?: number | null
          total_goals?: number | null
          xg_diff_10?: number | null
        }
        Update: {
          away_cards_against_avg_10?: number | null
          away_cards_against_avg_20?: number | null
          away_cards_against_avg_5?: number | null
          away_cards_for_avg_10?: number | null
          away_cards_for_avg_20?: number | null
          away_cards_for_avg_5?: number | null
          away_corners_against_avg_10?: number | null
          away_corners_against_avg_20?: number | null
          away_corners_against_avg_5?: number | null
          away_corners_for_avg_10?: number | null
          away_corners_for_avg_20?: number | null
          away_corners_for_avg_5?: number | null
          away_fouls_for_avg_10?: number | null
          away_fouls_for_avg_20?: number | null
          away_fouls_for_avg_5?: number | null
          away_goals?: number | null
          away_goals_against_avg_10?: number | null
          away_goals_against_avg_20?: number | null
          away_goals_against_avg_5?: number | null
          away_goals_for_avg_10?: number | null
          away_goals_for_avg_20?: number | null
          away_goals_for_avg_5?: number | null
          away_shots_for_avg_10?: number | null
          away_shots_for_avg_20?: number | null
          away_shots_for_avg_5?: number | null
          away_shots_on_target_avg_10?: number | null
          away_shots_on_target_avg_20?: number | null
          away_shots_on_target_avg_5?: number | null
          away_team?: string
          away_xg_against_avg_10?: number | null
          away_xg_against_avg_20?: number | null
          away_xg_against_avg_5?: number | null
          away_xg_for_avg_10?: number | null
          away_xg_for_avg_20?: number | null
          away_xg_for_avg_5?: number | null
          btts_hit?: boolean | null
          combined_cards_10?: number | null
          combined_corners_10?: number | null
          combined_goals_for_10?: number | null
          combined_shots_10?: number | null
          combined_xg_for_10?: number | null
          created_at?: string | null
          defense_weakness_index_10?: number | null
          discipline_gap_10?: number | null
          features_computed_at?: string | null
          fixture_date?: string
          fixture_id?: string
          fouls_momentum_5?: number | null
          home_cards_against_avg_10?: number | null
          home_cards_against_avg_20?: number | null
          home_cards_against_avg_5?: number | null
          home_cards_for_avg_10?: number | null
          home_cards_for_avg_20?: number | null
          home_cards_for_avg_5?: number | null
          home_corners_against_avg_10?: number | null
          home_corners_against_avg_20?: number | null
          home_corners_against_avg_5?: number | null
          home_corners_for_avg_10?: number | null
          home_corners_for_avg_20?: number | null
          home_corners_for_avg_5?: number | null
          home_fouls_for_avg_10?: number | null
          home_fouls_for_avg_20?: number | null
          home_fouls_for_avg_5?: number | null
          home_goals?: number | null
          home_goals_against_avg_10?: number | null
          home_goals_against_avg_20?: number | null
          home_goals_against_avg_5?: number | null
          home_goals_for_avg_10?: number | null
          home_goals_for_avg_20?: number | null
          home_goals_for_avg_5?: number | null
          home_shots_for_avg_10?: number | null
          home_shots_for_avg_20?: number | null
          home_shots_for_avg_5?: number | null
          home_shots_on_target_avg_10?: number | null
          home_shots_on_target_avg_20?: number | null
          home_shots_on_target_avg_5?: number | null
          home_team?: string
          home_xg_against_avg_10?: number | null
          home_xg_against_avg_20?: number | null
          home_xg_against_avg_5?: number | null
          home_xg_for_avg_10?: number | null
          home_xg_for_avg_20?: number | null
          home_xg_for_avg_5?: number | null
          id?: string
          league?: string
          league_avg_cards?: number | null
          league_avg_corners?: number | null
          league_avg_goals?: number | null
          league_btts_rate?: number | null
          league_over25_rate?: number | null
          max_source_match_date?: string | null
          over_25_hit?: boolean | null
          over_35_cards_hit?: boolean | null
          over_95_corners_hit?: boolean | null
          ref_avg_cards_last50?: number | null
          ref_over35_cards_rate_last50?: number | null
          referee_key?: string | null
          referee_name?: string | null
          region?: string
          shot_pressure_10?: number | null
          tempo_index_10?: number | null
          total_cards?: number | null
          total_corners?: number | null
          total_goals?: number | null
          xg_diff_10?: number | null
        }
        Relationships: []
      }
      ml_training_log: {
        Row: {
          created_at: string
          data_source: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          market: string
          model_type: string
          status: string
          target_trees: number
          total_available: number
          train_accuracy: number | null
          train_auc: number | null
          training_samples: number
          trees_trained: number
          val_accuracy: number | null
          val_auc: number | null
          validation_samples: number
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          market: string
          model_type?: string
          status?: string
          target_trees?: number
          total_available?: number
          train_accuracy?: number | null
          train_auc?: number | null
          training_samples?: number
          trees_trained?: number
          val_accuracy?: number | null
          val_auc?: number | null
          validation_samples?: number
        }
        Update: {
          created_at?: string
          data_source?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          market?: string
          model_type?: string
          status?: string
          target_trees?: number
          total_available?: number
          train_accuracy?: number | null
          train_auc?: number | null
          training_samples?: number
          trees_trained?: number
          val_accuracy?: number | null
          val_auc?: number | null
          validation_samples?: number
        }
        Relationships: []
      }
      referee_league_allowlist: {
        Row: {
          fixture_count: number | null
          is_approved: boolean | null
          league: string
          ref_present_count: number | null
          ref_present_rate: number | null
          sample_size: number | null
          sampled_at: string | null
          updated_at: string | null
        }
        Insert: {
          fixture_count?: number | null
          is_approved?: boolean | null
          league: string
          ref_present_count?: number | null
          ref_present_rate?: number | null
          sample_size?: number | null
          sampled_at?: string | null
          updated_at?: string | null
        }
        Update: {
          fixture_count?: number | null
          is_approved?: boolean | null
          league?: string
          ref_present_count?: number | null
          ref_present_rate?: number | null
          sample_size?: number | null
          sampled_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      regional_stats: {
        Row: {
          avg_per_game: number
          category: string
          created_at: string
          id: string
          last_updated: string
          league_name: string | null
          market: string
          matches_sampled: number
          region: string
          success_count: number
          success_percent: number
          team_id: number
          team_name: string
        }
        Insert: {
          avg_per_game?: number
          category: string
          created_at?: string
          id?: string
          last_updated?: string
          league_name?: string | null
          market: string
          matches_sampled?: number
          region: string
          success_count?: number
          success_percent?: number
          team_id: number
          team_name: string
        }
        Update: {
          avg_per_game?: number
          category?: string
          created_at?: string
          id?: string
          last_updated?: string
          league_name?: string | null
          market?: string
          matches_sampled?: number
          region?: string
          success_count?: number
          success_percent?: number
          team_id?: number
          team_name?: string
        }
        Relationships: []
      }
      saved_fixtures: {
        Row: {
          away_team: string
          bet_type: string
          created_at: string
          home_team: string
          id: string
          kickoff: string
          league: string
          market: string
          odds: number | null
          saved_team_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          away_team: string
          bet_type: string
          created_at?: string
          home_team: string
          id?: string
          kickoff: string
          league: string
          market: string
          odds?: number | null
          saved_team_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          away_team?: string
          bet_type?: string
          created_at?: string
          home_team?: string
          id?: string
          kickoff?: string
          league?: string
          market?: string
          odds?: number | null
          saved_team_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_fixtures_saved_team_id_fkey"
            columns: ["saved_team_id"]
            isOneToOne: false
            referencedRelation: "saved_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_teams: {
        Row: {
          bet_type: string
          created_at: string
          id: string
          league: string
          market: string
          region: string
          team_name: string
          user_id: string | null
        }
        Insert: {
          bet_type: string
          created_at?: string
          id?: string
          league: string
          market: string
          region: string
          team_name: string
          user_id?: string | null
        }
        Update: {
          bet_type?: string
          created_at?: string
          id?: string
          league?: string
          market?: string
          region?: string
          team_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sportmonks_matches: {
        Row: {
          away_corners: number | null
          away_fouls: number | null
          away_goals: number | null
          away_npxg: number | null
          away_possession: number | null
          away_red_cards: number | null
          away_shots: number | null
          away_shots_on_target: number | null
          away_team: string
          away_team_id: number | null
          away_xg: number | null
          away_xg_corners: number | null
          away_xg_open_play: number | null
          away_xg_set_play: number | null
          away_xga: number | null
          away_xgd: number | null
          away_xgot: number | null
          away_xpts: number | null
          away_yellow_cards: number | null
          btts_hit: boolean | null
          created_at: string | null
          fixture_date: string
          fixture_id: string
          home_corners: number | null
          home_fouls: number | null
          home_goals: number | null
          home_npxg: number | null
          home_possession: number | null
          home_red_cards: number | null
          home_shots: number | null
          home_shots_on_target: number | null
          home_team: string
          home_team_id: number | null
          home_xg: number | null
          home_xg_corners: number | null
          home_xg_open_play: number | null
          home_xg_set_play: number | null
          home_xga: number | null
          home_xgd: number | null
          home_xgot: number | null
          home_xpts: number | null
          home_yellow_cards: number | null
          id: string
          league: string
          league_id: number | null
          over_25_hit: boolean | null
          over_35_cards_hit: boolean | null
          over_95_corners_hit: boolean | null
          region: string | null
          season_id: number | null
          sportmonks_fixture_id: number | null
          total_cards: number | null
          total_corners: number | null
          total_goals: number | null
        }
        Insert: {
          away_corners?: number | null
          away_fouls?: number | null
          away_goals?: number | null
          away_npxg?: number | null
          away_possession?: number | null
          away_red_cards?: number | null
          away_shots?: number | null
          away_shots_on_target?: number | null
          away_team: string
          away_team_id?: number | null
          away_xg?: number | null
          away_xg_corners?: number | null
          away_xg_open_play?: number | null
          away_xg_set_play?: number | null
          away_xga?: number | null
          away_xgd?: number | null
          away_xgot?: number | null
          away_xpts?: number | null
          away_yellow_cards?: number | null
          btts_hit?: boolean | null
          created_at?: string | null
          fixture_date: string
          fixture_id: string
          home_corners?: number | null
          home_fouls?: number | null
          home_goals?: number | null
          home_npxg?: number | null
          home_possession?: number | null
          home_red_cards?: number | null
          home_shots?: number | null
          home_shots_on_target?: number | null
          home_team: string
          home_team_id?: number | null
          home_xg?: number | null
          home_xg_corners?: number | null
          home_xg_open_play?: number | null
          home_xg_set_play?: number | null
          home_xga?: number | null
          home_xgd?: number | null
          home_xgot?: number | null
          home_xpts?: number | null
          home_yellow_cards?: number | null
          id?: string
          league: string
          league_id?: number | null
          over_25_hit?: boolean | null
          over_35_cards_hit?: boolean | null
          over_95_corners_hit?: boolean | null
          region?: string | null
          season_id?: number | null
          sportmonks_fixture_id?: number | null
          total_cards?: number | null
          total_corners?: number | null
          total_goals?: number | null
        }
        Update: {
          away_corners?: number | null
          away_fouls?: number | null
          away_goals?: number | null
          away_npxg?: number | null
          away_possession?: number | null
          away_red_cards?: number | null
          away_shots?: number | null
          away_shots_on_target?: number | null
          away_team?: string
          away_team_id?: number | null
          away_xg?: number | null
          away_xg_corners?: number | null
          away_xg_open_play?: number | null
          away_xg_set_play?: number | null
          away_xga?: number | null
          away_xgd?: number | null
          away_xgot?: number | null
          away_xpts?: number | null
          away_yellow_cards?: number | null
          btts_hit?: boolean | null
          created_at?: string | null
          fixture_date?: string
          fixture_id?: string
          home_corners?: number | null
          home_fouls?: number | null
          home_goals?: number | null
          home_npxg?: number | null
          home_possession?: number | null
          home_red_cards?: number | null
          home_shots?: number | null
          home_shots_on_target?: number | null
          home_team?: string
          home_team_id?: number | null
          home_xg?: number | null
          home_xg_corners?: number | null
          home_xg_open_play?: number | null
          home_xg_set_play?: number | null
          home_xga?: number | null
          home_xgd?: number | null
          home_xgot?: number | null
          home_xpts?: number | null
          home_yellow_cards?: number | null
          id?: string
          league?: string
          league_id?: number | null
          over_25_hit?: boolean | null
          over_35_cards_hit?: boolean | null
          over_95_corners_hit?: boolean | null
          region?: string | null
          season_id?: number | null
          sportmonks_fixture_id?: number | null
          total_cards?: number | null
          total_corners?: number | null
          total_goals?: number | null
        }
        Relationships: []
      }
      sportmonks_ml_features: {
        Row: {
          away_cards_l10: number | null
          away_corners_against_l10: number | null
          away_corners_for_l10: number | null
          away_fouls_l10: number | null
          away_goals: number | null
          away_goals_against_l10: number | null
          away_goals_for_l10: number | null
          away_npxg_l10: number | null
          away_possession_l10: number | null
          away_shots_l10: number | null
          away_shots_on_target_l10: number | null
          away_team: string
          away_xg_corners_l10: number | null
          away_xg_l10: number | null
          away_xg_open_play_l10: number | null
          away_xg_set_play_l10: number | null
          away_xga_l10: number | null
          away_xgd_l10: number | null
          away_xgot_l10: number | null
          away_xpts_l10: number | null
          btts_hit: boolean | null
          cards_per_foul_away_l10: number | null
          cards_per_foul_home_l10: number | null
          combined_cards_l10: number | null
          combined_corners_l10: number | null
          combined_goals_l10: number | null
          combined_npxg_l10: number | null
          combined_shots_l10: number | null
          combined_xg_l10: number | null
          combined_xgot_l10: number | null
          corners_per_shot_away_l10: number | null
          corners_per_shot_home_l10: number | null
          defense_weakness_xga_l10: number | null
          features_computed_at: string | null
          fixture_date: string
          fixture_id: string
          fouls_per_possession_away_l10: number | null
          fouls_per_possession_home_l10: number | null
          goals_per_corner_away_l10: number | null
          goals_per_corner_home_l10: number | null
          home_cards_l10: number | null
          home_corners_against_l10: number | null
          home_corners_for_l10: number | null
          home_fouls_l10: number | null
          home_goals: number | null
          home_goals_against_l10: number | null
          home_goals_for_l10: number | null
          home_npxg_l10: number | null
          home_possession_l10: number | null
          home_shots_l10: number | null
          home_shots_on_target_l10: number | null
          home_team: string
          home_xg_corners_l10: number | null
          home_xg_l10: number | null
          home_xg_open_play_l10: number | null
          home_xg_set_play_l10: number | null
          home_xga_l10: number | null
          home_xgd_l10: number | null
          home_xgot_l10: number | null
          home_xpts_l10: number | null
          id: string
          implied_prob_btts: number | null
          implied_prob_over25: number | null
          league: string
          league_avg_cards: number | null
          league_avg_corners: number | null
          league_avg_goals: number | null
          league_avg_xg: number | null
          league_btts_rate: number | null
          league_over25_rate: number | null
          max_source_match_date: string | null
          odds_away_win: number | null
          odds_btts_no: number | null
          odds_btts_yes: number | null
          odds_draw: number | null
          odds_home_win: number | null
          odds_over25: number | null
          odds_under25: number | null
          over_25_hit: boolean | null
          over_35_cards_hit: boolean | null
          over_95_corners_hit: boolean | null
          region: string | null
          shots_on_target_ratio_away_l10: number | null
          shots_on_target_ratio_home_l10: number | null
          shots_per_possession_away_l10: number | null
          shots_per_possession_home_l10: number | null
          total_cards: number | null
          total_corners: number | null
          total_goals: number | null
          xg_diff_l10: number | null
          xg_per_shot_away_l10: number | null
          xg_per_shot_home_l10: number | null
        }
        Insert: {
          away_cards_l10?: number | null
          away_corners_against_l10?: number | null
          away_corners_for_l10?: number | null
          away_fouls_l10?: number | null
          away_goals?: number | null
          away_goals_against_l10?: number | null
          away_goals_for_l10?: number | null
          away_npxg_l10?: number | null
          away_possession_l10?: number | null
          away_shots_l10?: number | null
          away_shots_on_target_l10?: number | null
          away_team: string
          away_xg_corners_l10?: number | null
          away_xg_l10?: number | null
          away_xg_open_play_l10?: number | null
          away_xg_set_play_l10?: number | null
          away_xga_l10?: number | null
          away_xgd_l10?: number | null
          away_xgot_l10?: number | null
          away_xpts_l10?: number | null
          btts_hit?: boolean | null
          cards_per_foul_away_l10?: number | null
          cards_per_foul_home_l10?: number | null
          combined_cards_l10?: number | null
          combined_corners_l10?: number | null
          combined_goals_l10?: number | null
          combined_npxg_l10?: number | null
          combined_shots_l10?: number | null
          combined_xg_l10?: number | null
          combined_xgot_l10?: number | null
          corners_per_shot_away_l10?: number | null
          corners_per_shot_home_l10?: number | null
          defense_weakness_xga_l10?: number | null
          features_computed_at?: string | null
          fixture_date: string
          fixture_id: string
          fouls_per_possession_away_l10?: number | null
          fouls_per_possession_home_l10?: number | null
          goals_per_corner_away_l10?: number | null
          goals_per_corner_home_l10?: number | null
          home_cards_l10?: number | null
          home_corners_against_l10?: number | null
          home_corners_for_l10?: number | null
          home_fouls_l10?: number | null
          home_goals?: number | null
          home_goals_against_l10?: number | null
          home_goals_for_l10?: number | null
          home_npxg_l10?: number | null
          home_possession_l10?: number | null
          home_shots_l10?: number | null
          home_shots_on_target_l10?: number | null
          home_team: string
          home_xg_corners_l10?: number | null
          home_xg_l10?: number | null
          home_xg_open_play_l10?: number | null
          home_xg_set_play_l10?: number | null
          home_xga_l10?: number | null
          home_xgd_l10?: number | null
          home_xgot_l10?: number | null
          home_xpts_l10?: number | null
          id?: string
          implied_prob_btts?: number | null
          implied_prob_over25?: number | null
          league: string
          league_avg_cards?: number | null
          league_avg_corners?: number | null
          league_avg_goals?: number | null
          league_avg_xg?: number | null
          league_btts_rate?: number | null
          league_over25_rate?: number | null
          max_source_match_date?: string | null
          odds_away_win?: number | null
          odds_btts_no?: number | null
          odds_btts_yes?: number | null
          odds_draw?: number | null
          odds_home_win?: number | null
          odds_over25?: number | null
          odds_under25?: number | null
          over_25_hit?: boolean | null
          over_35_cards_hit?: boolean | null
          over_95_corners_hit?: boolean | null
          region?: string | null
          shots_on_target_ratio_away_l10?: number | null
          shots_on_target_ratio_home_l10?: number | null
          shots_per_possession_away_l10?: number | null
          shots_per_possession_home_l10?: number | null
          total_cards?: number | null
          total_corners?: number | null
          total_goals?: number | null
          xg_diff_l10?: number | null
          xg_per_shot_away_l10?: number | null
          xg_per_shot_home_l10?: number | null
        }
        Update: {
          away_cards_l10?: number | null
          away_corners_against_l10?: number | null
          away_corners_for_l10?: number | null
          away_fouls_l10?: number | null
          away_goals?: number | null
          away_goals_against_l10?: number | null
          away_goals_for_l10?: number | null
          away_npxg_l10?: number | null
          away_possession_l10?: number | null
          away_shots_l10?: number | null
          away_shots_on_target_l10?: number | null
          away_team?: string
          away_xg_corners_l10?: number | null
          away_xg_l10?: number | null
          away_xg_open_play_l10?: number | null
          away_xg_set_play_l10?: number | null
          away_xga_l10?: number | null
          away_xgd_l10?: number | null
          away_xgot_l10?: number | null
          away_xpts_l10?: number | null
          btts_hit?: boolean | null
          cards_per_foul_away_l10?: number | null
          cards_per_foul_home_l10?: number | null
          combined_cards_l10?: number | null
          combined_corners_l10?: number | null
          combined_goals_l10?: number | null
          combined_npxg_l10?: number | null
          combined_shots_l10?: number | null
          combined_xg_l10?: number | null
          combined_xgot_l10?: number | null
          corners_per_shot_away_l10?: number | null
          corners_per_shot_home_l10?: number | null
          defense_weakness_xga_l10?: number | null
          features_computed_at?: string | null
          fixture_date?: string
          fixture_id?: string
          fouls_per_possession_away_l10?: number | null
          fouls_per_possession_home_l10?: number | null
          goals_per_corner_away_l10?: number | null
          goals_per_corner_home_l10?: number | null
          home_cards_l10?: number | null
          home_corners_against_l10?: number | null
          home_corners_for_l10?: number | null
          home_fouls_l10?: number | null
          home_goals?: number | null
          home_goals_against_l10?: number | null
          home_goals_for_l10?: number | null
          home_npxg_l10?: number | null
          home_possession_l10?: number | null
          home_shots_l10?: number | null
          home_shots_on_target_l10?: number | null
          home_team?: string
          home_xg_corners_l10?: number | null
          home_xg_l10?: number | null
          home_xg_open_play_l10?: number | null
          home_xg_set_play_l10?: number | null
          home_xga_l10?: number | null
          home_xgd_l10?: number | null
          home_xgot_l10?: number | null
          home_xpts_l10?: number | null
          id?: string
          implied_prob_btts?: number | null
          implied_prob_over25?: number | null
          league?: string
          league_avg_cards?: number | null
          league_avg_corners?: number | null
          league_avg_goals?: number | null
          league_avg_xg?: number | null
          league_btts_rate?: number | null
          league_over25_rate?: number | null
          max_source_match_date?: string | null
          odds_away_win?: number | null
          odds_btts_no?: number | null
          odds_btts_yes?: number | null
          odds_draw?: number | null
          odds_home_win?: number | null
          odds_over25?: number | null
          odds_under25?: number | null
          over_25_hit?: boolean | null
          over_35_cards_hit?: boolean | null
          over_95_corners_hit?: boolean | null
          region?: string | null
          shots_on_target_ratio_away_l10?: number | null
          shots_on_target_ratio_home_l10?: number | null
          shots_per_possession_away_l10?: number | null
          shots_per_possession_home_l10?: number | null
          total_cards?: number | null
          total_corners?: number | null
          total_goals?: number | null
          xg_diff_l10?: number | null
          xg_per_shot_away_l10?: number | null
          xg_per_shot_home_l10?: number | null
        }
        Relationships: []
      }
      team_rolling_stats: {
        Row: {
          avg_cards_against: number | null
          avg_cards_for: number | null
          avg_corners_against: number | null
          avg_corners_for: number | null
          avg_goals_conceded: number | null
          avg_goals_scored: number | null
          avg_possession: number | null
          avg_shots_for: number | null
          avg_shots_on_target: number | null
          avg_total_cards: number | null
          avg_total_corners: number | null
          avg_total_goals: number | null
          avg_xg_against: number | null
          avg_xg_for: number | null
          away_avg_cards_against: number | null
          away_avg_cards_for: number | null
          away_avg_corners_against: number | null
          away_avg_corners_for: number | null
          away_avg_goals_conceded: number | null
          away_avg_goals_scored: number | null
          away_avg_total_cards: number | null
          away_avg_total_corners: number | null
          away_avg_total_goals: number | null
          away_btts_pct: number | null
          away_matches_used: number | null
          away_over_25_goals_pct: number | null
          away_over_35_cards_pct: number | null
          away_over_95_corners_pct: number | null
          btts_pct: number | null
          clean_sheet_pct: number | null
          created_at: string | null
          draws: number | null
          failed_to_score_pct: number | null
          form_string: string | null
          home_avg_cards_against: number | null
          home_avg_cards_for: number | null
          home_avg_corners_against: number | null
          home_avg_corners_for: number | null
          home_avg_goals_conceded: number | null
          home_avg_goals_scored: number | null
          home_avg_total_cards: number | null
          home_avg_total_corners: number | null
          home_avg_total_goals: number | null
          home_btts_pct: number | null
          home_matches_used: number | null
          home_over_25_goals_pct: number | null
          home_over_35_cards_pct: number | null
          home_over_95_corners_pct: number | null
          id: string
          last_updated: string | null
          league: string
          league_id: number | null
          losses: number | null
          match_ids: string[] | null
          matches_used: number
          over_105_corners_pct: number | null
          over_15_goals_pct: number | null
          over_25_cards_pct: number | null
          over_25_goals_pct: number | null
          over_35_cards_pct: number | null
          over_35_goals_pct: number | null
          over_45_cards_pct: number | null
          over_85_corners_pct: number | null
          over_95_corners_pct: number | null
          region: string
          team_id: number
          team_name: string
          wins: number | null
        }
        Insert: {
          avg_cards_against?: number | null
          avg_cards_for?: number | null
          avg_corners_against?: number | null
          avg_corners_for?: number | null
          avg_goals_conceded?: number | null
          avg_goals_scored?: number | null
          avg_possession?: number | null
          avg_shots_for?: number | null
          avg_shots_on_target?: number | null
          avg_total_cards?: number | null
          avg_total_corners?: number | null
          avg_total_goals?: number | null
          avg_xg_against?: number | null
          avg_xg_for?: number | null
          away_avg_cards_against?: number | null
          away_avg_cards_for?: number | null
          away_avg_corners_against?: number | null
          away_avg_corners_for?: number | null
          away_avg_goals_conceded?: number | null
          away_avg_goals_scored?: number | null
          away_avg_total_cards?: number | null
          away_avg_total_corners?: number | null
          away_avg_total_goals?: number | null
          away_btts_pct?: number | null
          away_matches_used?: number | null
          away_over_25_goals_pct?: number | null
          away_over_35_cards_pct?: number | null
          away_over_95_corners_pct?: number | null
          btts_pct?: number | null
          clean_sheet_pct?: number | null
          created_at?: string | null
          draws?: number | null
          failed_to_score_pct?: number | null
          form_string?: string | null
          home_avg_cards_against?: number | null
          home_avg_cards_for?: number | null
          home_avg_corners_against?: number | null
          home_avg_corners_for?: number | null
          home_avg_goals_conceded?: number | null
          home_avg_goals_scored?: number | null
          home_avg_total_cards?: number | null
          home_avg_total_corners?: number | null
          home_avg_total_goals?: number | null
          home_btts_pct?: number | null
          home_matches_used?: number | null
          home_over_25_goals_pct?: number | null
          home_over_35_cards_pct?: number | null
          home_over_95_corners_pct?: number | null
          id?: string
          last_updated?: string | null
          league: string
          league_id?: number | null
          losses?: number | null
          match_ids?: string[] | null
          matches_used?: number
          over_105_corners_pct?: number | null
          over_15_goals_pct?: number | null
          over_25_cards_pct?: number | null
          over_25_goals_pct?: number | null
          over_35_cards_pct?: number | null
          over_35_goals_pct?: number | null
          over_45_cards_pct?: number | null
          over_85_corners_pct?: number | null
          over_95_corners_pct?: number | null
          region?: string
          team_id: number
          team_name: string
          wins?: number | null
        }
        Update: {
          avg_cards_against?: number | null
          avg_cards_for?: number | null
          avg_corners_against?: number | null
          avg_corners_for?: number | null
          avg_goals_conceded?: number | null
          avg_goals_scored?: number | null
          avg_possession?: number | null
          avg_shots_for?: number | null
          avg_shots_on_target?: number | null
          avg_total_cards?: number | null
          avg_total_corners?: number | null
          avg_total_goals?: number | null
          avg_xg_against?: number | null
          avg_xg_for?: number | null
          away_avg_cards_against?: number | null
          away_avg_cards_for?: number | null
          away_avg_corners_against?: number | null
          away_avg_corners_for?: number | null
          away_avg_goals_conceded?: number | null
          away_avg_goals_scored?: number | null
          away_avg_total_cards?: number | null
          away_avg_total_corners?: number | null
          away_avg_total_goals?: number | null
          away_btts_pct?: number | null
          away_matches_used?: number | null
          away_over_25_goals_pct?: number | null
          away_over_35_cards_pct?: number | null
          away_over_95_corners_pct?: number | null
          btts_pct?: number | null
          clean_sheet_pct?: number | null
          created_at?: string | null
          draws?: number | null
          failed_to_score_pct?: number | null
          form_string?: string | null
          home_avg_cards_against?: number | null
          home_avg_cards_for?: number | null
          home_avg_corners_against?: number | null
          home_avg_corners_for?: number | null
          home_avg_goals_conceded?: number | null
          home_avg_goals_scored?: number | null
          home_avg_total_cards?: number | null
          home_avg_total_corners?: number | null
          home_avg_total_goals?: number | null
          home_btts_pct?: number | null
          home_matches_used?: number | null
          home_over_25_goals_pct?: number | null
          home_over_35_cards_pct?: number | null
          home_over_95_corners_pct?: number | null
          id?: string
          last_updated?: string | null
          league?: string
          league_id?: number | null
          losses?: number | null
          match_ids?: string[] | null
          matches_used?: number
          over_105_corners_pct?: number | null
          over_15_goals_pct?: number | null
          over_25_cards_pct?: number | null
          over_25_goals_pct?: number | null
          over_35_cards_pct?: number | null
          over_35_goals_pct?: number | null
          over_45_cards_pct?: number | null
          over_85_corners_pct?: number | null
          over_95_corners_pct?: number | null
          region?: string
          team_id?: number
          team_name?: string
          wins?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      pl_summary: {
        Row: {
          losses: number | null
          net_profit: number | null
          prediction_date: string | null
          roi: number | null
          total_bets: number | null
          total_returns: number | null
          total_staked: number | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
