import { api } from './client';
import type { BoardColumn, HistoryItem, Task, TodayResponse } from '../types/task';

export const fetchTasks = async (): Promise<Task[]> => {
  const { data } = await api.get<Task[]>('/tasks');
  return data;
};

export const createTask = async (title: string): Promise<Task> => {
  const { data } = await api.post<Task>('/tasks', { title, description: '' });
  return data;
};

export const fetchColumns = async (): Promise<BoardColumn[]> => {
  const { data } = await api.get<BoardColumn[]>('/columns');
  return data;
};

export const fetchHistory = async (): Promise<HistoryItem[]> => {
  const { data } = await api.get<HistoryItem[]>('/history');
  return data;
};

export const fetchToday = async (): Promise<TodayResponse> => {
  const { data } = await api.get<TodayResponse>('/today');
  return data;
};
