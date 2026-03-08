import type { Timestamp } from "firebase-admin/firestore";

export interface ShortenRequest {
  url: string;
  custom_code?: string;
  code?: string;
}

export interface ShortenResponse {
  short_code: string;
  short_url: string;
}

export interface ResolveResponse {
  url: string;
}

export interface ApiError {
  error: string;
}

export interface LinkDocument {
  shortCode: string;
  url: string;
  ownerUid: string | null;
  isCustom: boolean;
  isDeleted: boolean;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedRequestContext {
  uid: string;
  email: string | null;
}

export interface RawLinkDocument {
  url: string;
  ownerUid: string | null;
  isCustom: boolean;
  isDeleted?: boolean;
  clickCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
