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
  name: string
  displayName: string
  role: Role
}

export interface UserResponse {
  id: number
  email: string
  name: string
  displayName: string
  role: Role
  active: boolean
}

export interface CreateUserRequest {
  email: string
  name: string
  // Opcional — el backend lo deriva del nombre completo si no se envía.
  displayName?: string
  password: string
  role: Role
}

export interface UpdateUserRequest {
  email?: string
  name?: string
  displayName?: string
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
}

export interface ProductDetailResponse {
  id: number
  name: string
  categoryId: number
  categoryName: string
  actsAsCategory: ComboCategory | null
  unitPrice: number | null
}

export interface UpdateProductRequest {
  name: string
  categoryId: number
  actsAsCategory: ComboCategory | null
  unitPrice: number | null
}

// Un lote recibido de un producto — su propia cantidad y vencimiento, independiente
// de cualquier otro lote del mismo producto (a diferencia del viejo campo único que
// se sobreescribía en cada edición, esto sí lleva historial).
export interface ProductBatchRequest {
  quantity: number
  expirationDate: string | null
}

export interface ProductBatchResponse {
  id: number
  quantityReceived: number
  quantityRemaining: number
  expirationDate: string | null
  receivedAt: string
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
  salonId: number
  salonName: string
  // Posición en el plano del salón, 0-100 (porcentaje del lienzo).
  positionX: number
  positionY: number
}

export interface TableSummaryResponse {
  tables: TableEntityDto[]
  freeTables: number
  inUseTables: number
}

export interface SalonResponse {
  id: number
  name: string
  sortOrder: number
  tableCount: number
}

export interface SalonLayoutResponse {
  salonId: number
  savedAt: string
  savedBy: string
  tableCount: number
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

// Una línea de pago (ej. $20.000 en efectivo) — un pedido puede tener varias si se
// pagó dividido entre métodos.
export interface PaymentLine {
  paymentTypeId: number
  amount: number
}

export interface OrderPaymentResponse {
  paymentTypeName: string
  amount: number
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
  // Solo viene lleno si se pagó con un único método — con pago dividido queda null y
  // el desglose real está en `payments`.
  paymentType: PaymentTypeResponse | null
  paid: boolean
  payments: OrderPaymentResponse[]
  waiterName: string
}

export interface OrderDetailsResponse extends OrdersResponse {
  orderItems: OrderItemResponse[]
}

export interface OrderRequest {
  items: ProductWithIdAndQuantity[]
  mealType: string
  // null cuando no hay menú configurado hoy para este tipo de comida — válido igual
  // si el plato es solo bebidas, que no dependen del menú del día.
  menuId: number | null
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
  payments: PaymentLine[] | null
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

export interface CashMovementResponse {
  id: number
  type: 'ENTRADA' | 'SALIDA'
  amount: number
  reason: string
  createdAt: string
  createdBy: string
}

// Mientras el turno sigue abierto, `counted`/`difference` vienen null — solo se
// llenan al cerrar (`expected` sí se calcula en vivo).
export interface MethodReconciliationResponse {
  paymentTypeName: string
  expected: number
  counted: number | null
  difference: number | null
}

// Mientras el turno sigue abierto, `expectedCash` viene calculado en vivo y
// `countedCash`/`difference` son null — solo se llenan al cerrar. Lo mismo aplica a
// `totalCountedAllMethods`/`totalDifferenceAllMethods`.
export interface CashShiftResponse {
  id: number
  openedAt: string
  openedBy: string
  openingCash: number
  closedAt: string | null
  closedBy: string | null
  countedCash: number | null
  expectedCash: number
  difference: number | null
  notes: string | null
  cashSales: number
  salesByMethod: PaymentTotalResponse[]
  totalEntradas: number
  totalSalidas: number
  movements: CashMovementResponse[]
  methodReconciliations: MethodReconciliationResponse[]
  totalExpectedAllMethods: number
  totalCountedAllMethods: number | null
  totalDifferenceAllMethods: number | null
}

export interface OpenShiftRequest {
  openingCash: number
}

export interface CloseShiftRequest {
  // Contado/verificado por método de pago (ej. { Efectivo: 120000, Tarjeta: 85000 }).
  // Un método que no venga se asume cuadrado (contado = esperado).
  countedByMethod: Record<string, number>
  notes: string
}

export interface CashMovementRequest {
  type: 'ENTRADA' | 'SALIDA'
  amount: number
  reason: string
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
  payments: PaymentLine[]
}

// Resultado de cobrar. `change` es el vuelto a devolver cuando el cliente pagó de
// más; 0 si pagó justo. En caja siempre queda `total`, no `tendered`.
export interface PaymentResultResponse {
  total: number
  tendered: number
  change: number
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

export interface CustomerPaymentResponse {
  paidAt: string
  paymentTypeName: string
  total: number
  orders: {
    orderId: number
    createdAt: string
    amount: number
    diningTable: DiningTableResponse | null
  }[]
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
  printingEnabled: boolean
}

export interface UpdatePrinterSettingRequest {
  printerName: string
  printingEnabled: boolean
}

export interface TicketLineResponse {
  text: string
  bold: boolean
  center: boolean
  rule: boolean
  // Título del ticket — se muestra más grande en la vista previa.
  big: boolean
}

// printed=false: no había impresora activada, esto es solo la vista previa de lo que
// se habría impreso.
export interface TicketPreviewResponse {
  title: string
  printed: boolean
  lines: TicketLineResponse[]
}

export interface KitchenMessageResponse {
  id: number
  text: string
  sentBy: string
  createdAt: string
}
