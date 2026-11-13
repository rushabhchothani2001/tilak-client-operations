import type {
  CreateUserInput,
  Customer,
  CustomerInput,
  Language,
  UpdateUserInput,
  User,
  ManufacturingOrder,
  Order,
  OrderInput,
  OrderStatus,
  StatusUpdateInput,
} from '../types';
import { http } from './http';

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const authApi = {
  me: () => http.get<User>('/auth/me'),
  login: (username: string, password: string) => http.post<User>('/auth/login', { username, password }),
  logout: () => http.post<void>('/auth/logout', {}),
  setLanguage: (language: Language) => http.patch<User>('/auth/me/preferences', { language }),
};

export const usersApi = {
  list: () => http.get<User[]>('/users'),
  create: (input: CreateUserInput) => http.post<User>('/users', input),
  update: (id: string, input: UpdateUserInput) => http.patch<User>(`/users/${id}`, input),
};

export const customersApi = {
  list: (search?: string) => http.get<Customer[]>(`/customers${query({ search })}`),
  get: (id: string) => http.get<Customer>(`/customers/${id}`),
  create: (input: CustomerInput) => http.post<Customer>('/customers', input),
  update: (id: string, input: CustomerInput) => http.put<Customer>(`/customers/${id}`, input),
  remove: (id: string) => http.delete(`/customers/${id}`),
};

export const ordersApi = {
  list: (filters: { status?: OrderStatus; customer?: string } = {}) =>
    http.get<Order[]>(`/orders${query(filters)}`),
  get: (id: string) => http.get<Order<Customer>>(`/orders/${id}`),
  create: (input: OrderInput) => http.post<Order>('/orders', input),
  remove: (id: string) => http.delete(`/orders/${id}`),
};

export type ManufacturingFilter = 'active' | OrderStatus | 'all';

export const manufacturingApi = {
  list: (status: ManufacturingFilter) =>
    http.get<ManufacturingOrder[]>(`/manufacturing/orders${query({ status: status === 'all' ? undefined : status })}`),
  get: (id: string) => http.get<ManufacturingOrder>(`/manufacturing/orders/${id}`),
  updateStatus: (id: string, input: StatusUpdateInput) =>
    http.patch<ManufacturingOrder>(`/manufacturing/orders/${id}/status`, input),
};
