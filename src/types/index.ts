// Mirrors the DTOs in miresta-api. Money fields are plain numbers (COP, no decimals) —
// the backend's Money value object serializes as a bare number.

export type Role = 'OWNER' | 'ADMIN' | 'MESERO'

export type ComboCategory =
  | 'SOPA'
  | 'PRINCIPIO'
  | 'PROTEINA'
  | 'ACOMPANANTE'
  | 'ADICIONAL'
  | 'BEBIDA'
  | 'ESPECIAL'
  | 'ENVASE'

export type PriceCode =
  | 'DESAYUNO_COMPLETO'
  | 'DESAYUNO_BANDEJA'
  | 'DESAYUNO_CALDO_SUELTO'
  | 'DESAYUNO_ACOMPANANTE_ADICION'
  | 'DESAYUNO_PROTEINA_ADICION'
  | 'DESAYUNO_PROTEINA_SUELTA'
  | 'DESAYUNO_COMPONENTE_SUELTO'
  | 'ALMUERZO_COMPLETO'
  | 'ALMUERZO_BANDEJA'
  | 'ALMUERZO_SOPA_SUELTA'
  | 'ALMUERZO_ACOMPANANTE_ADICION'
  | 'ALMUERZO_PROTEINA_ADICION'
  | 'ALMUERZO_PROTEINA_SUELTA'
  | 'ALMUERZO_COMPONENTE_SUELTO'
  | 'ESPECIAL_COMPLETO'
  | 'ESPECIAL_ACOMPANANTE_ADICION'
  | 'ESPECIAL_PROTEINA_ADICION'
  | 'ESPECIAL_COMPONENTE_SUELTO'
  | 'BEBIDA_DEFAULT'
  | 'BEBIDA_PERSONAL'
  | 'BEBIDA_COCA_COLA_PERSONAL'
  | 'BEBIDA_COCA_COLA_1_5'
  | 'ENVASE_SOPA'
  | 'ENVASE_BANDEJA'

export interface LoginResponse {
  token: string
  email: string
  role: Role
}

export interface UserResponse {
  id: number
  email: string
  role: Role
  active: boolean
}

export interface CreateUserRequest {
  email: string
  password: string
  role: Role
}

export interface UpdateUserRequest {
  email?: string
  password?: string
  role?: Role
  active?: boolean
}

export interface CategoryInfo {
  name: string
}

export interface CategoryResponse {
  id: number
  name: string
  code: ComboCategory
}

export interface CategoryRequest {
  name: string
  code: ComboCategory
}

export interface UpdateCategoryRequest {
  name?: string
  code?: ComboCategory
}

export interface ProductInfo {
  id: number
  name: string
  category: CategoryInfo
}

export interface ProductDetailsInfo {
  expirationDate: string | null
  quantity: number | null
  price: number
}

export interface ProductWithDetails {
  id: number
  name: string
  category: CategoryInfo
  productDetails: ProductDetailsInfo[]
}

export interface ProductRequest {
  name: string
  categoryId: number
  expirationDate: string | null
  quantity: number | null
  unitPrice: number | null
}

export interface ProductDetailResponse {
  id: number
  name: string
  categoryId: number
  categoryName: string
  actsAsCategory: ComboCategory | null
  expirationDate: string | null
  quantity: number | null
  unitPrice: number | null
}

export interface UpdateProductRequest {
  name: string
  categoryId: number
  actsAsCategory: ComboCategory | null
  expirationDate: string | null
  quantity: number | null
  unitPrice: number | null
}

export interface ProductWithIdAndQuantity {
  id: number
  quantity: number | null // null = sin límite
  replacement: ComboCategory | null
}

export interface ProductDto {
  id: number
  name: string
  quantity: number | null
}

export interface ItemResponse {
  category: string
  products: ProductDto[]
}

export interface MenuResponse {
  id: number
  date: string
  type: string
  items: ItemResponse[]
}

export interface CreateMenuRequest {
  date: string // dd/MM/yyyy
  foodType: string
  products: ProductWithIdAndQuantity[]
}

export interface MenuOfferingResponse {
  id: number
  menuDate: string
  foodType: string
}

export interface TableEntityDto {
  id: number
  number: number
  status: string
}

export interface TableSummaryResponse {
  tables: TableEntityDto[]
  freeTables: number
  inUseTables: number
}

export interface DiningTableResponse {
  id: number
  number: number
  status: string
}

export interface OrderStatusDto {
  id: number
  name: string
}

export interface OrderTypeDto {
  id: number
  name: string
}

export interface OrderItemProductResponse {
  id: number
  name: string
  quantity: number
  unitExtraPrice: number
  catalogPrice: number
  replacementCategory: ComboCategory | null
  lineTotal: number | null
}

export interface GroupedOrderItemResponse {
  category: string
  products: OrderItemProductResponse[]
}

export interface OrderItemResponse {
  id: number
  comments: string | null
  comboLabel: string | null
  // This plato's own customer if it has one, else the order's own customer — never
  // null when the order itself has a customer (backend resolves the fallback).
  customer: CustomerResponse | null
  baseTotal: number
  drinksTotal: number
  proteinAdditionalsTotal: number
  sideAdditionalsTotal: number
  extrasTotal: number
  individualsTotal: number
  toGoSurcharge: number
  total: number
  menuOffering: MenuOfferingResponse
  orderType: OrderTypeDto
  itemsByCategory: GroupedOrderItemResponse[]
}

export interface OrdersResponse {
  id: number
  createdAt: string
  notes: string | null
  subtotal: number
  total: number
  diningTable: DiningTableResponse | null
  orderStatus: OrderStatusDto
  customer: CustomerResponse | null
  paymentType: PaymentTypeResponse | null
  paid: boolean
}

export interface OrderDetailsResponse extends OrdersResponse {
  orderItems: OrderItemResponse[]
}

export interface OrderRequest {
  items: ProductWithIdAndQuantity[]
  mealType: string
  menuId: number
  isToGo: boolean
  count: number | null
  comments: string | null
  // This plato's own customer — absent/null falls back to CreateOrderRequest's
  // top-level customerId (a table with mixed platos for different people).
  customerId: number | null
}

export interface CreateOrderRequest {
  orders: OrderRequest[]
  tableId: number | null
  customerId: number | null
}

export interface UpdateStatusRequest {
  status: string
  paymentTypeId: number | null
}

export interface PaymentTypeResponse {
  id: number
  name: string
}

export interface PaymentTotalResponse {
  paymentTypeName: string
  orderCount: number
  total: number
}

export interface MealTypeSummary {
  mealType: string
  orderItemCount: number
  total: number
}

export interface FulfillmentSummary {
  type: 'EN_SITIO' | 'PARA_LLEVAR'
  orderItemCount: number
  total: number
}

export interface HourlyCount {
  hour: number
  orderCount: number
}

export interface DailyReportResponse {
  totalOrders: number
  cancelledOrders: number
  totalSales: number
  registeredCustomersOrdered: number
  openTabsCount: number
  openTabsTotal: number
  additionsCount: number
  mealTypeCounts: MealTypeSummary[]
  fulfillmentCounts: FulfillmentSummary[]
  hourlyCounts: HourlyCount[]
}

export interface PayOrderRequest {
  paymentTypeId: number
}

export interface SettleTabRequest {
  paymentTypeId: number
}

export interface SettleTabResponse {
  ordersSettled: number
  totalPaid: number
}

export interface CustomerBalanceResponse {
  customerId: number
  customerName: string
  pendingOrders: number
  totalOwed: number
}

export interface CustomerResponse {
  id: number
  name: string
  phone: string
  active: boolean
}

export interface CustomerRequest {
  name: string
  phone: string
}

export interface UpdateCustomerRequest {
  name?: string
  phone?: string
  active?: boolean
}

export interface PriceSettingResponse {
  code: PriceCode
  label: string
  amount: number
  confirmed: boolean
  configured: boolean
}

export interface UpdatePriceSettingRequest {
  amount?: number
  label?: string
  confirmed?: boolean
}

export interface PriceSettingHistoryResponse {
  id: number
  previousAmount: number
  newAmount: number
  previousLabel: string
  newLabel: string
  previousConfirmed: boolean
  newConfirmed: boolean
  changedBy: string | null
  changedAt: string
}

export interface PrinterSettingResponse {
  printerName: string
}

export interface UpdatePrinterSettingRequest {
  printerName: string
}
