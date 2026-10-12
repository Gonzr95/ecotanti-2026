export interface OrderProfitAnalysis {
  order_id: number;
  order_number: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin_percentage: number;
  created_at: string;
}

export interface ItemProfitAnalysis {
  item_name: string;
  quantity_sold: number;
  unit_price: number;
  cost_price: number;
  unit_cost?: number;
  unit_profit: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin_percentage: number;
}

export interface OfferPerformanceAnalysis {
  offer_id: number;
  offer_name: string;
  total_units_sold: number;
  total_revenue: number;
  total_discount_given: number;
  total_cost: number;
  gross_profit: number;
  profit_margin_percentage: number;
}


