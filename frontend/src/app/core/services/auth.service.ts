import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, Role, User } from '../models/user.model';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, 'ADMIN'>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<User | null>(readStoredUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, payload)
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): void {
    safeStorage(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    });
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return safeStorage(() => localStorage.getItem(TOKEN_KEY)) ?? null;
  }

  hasRole(role: Role): boolean {
    return this.currentUser()?.role === role;
  }

  /** Ruta de inicio según el rol del usuario. */
  homeFor(user: User | null = this.currentUser()): string {
    return user?.role === 'BAKER' ? '/dashboard' : '/mis-pedidos';
  }

  private setSession(res: AuthResponse): void {
    safeStorage(() => {
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    });
    this.currentUser.set(res.user);
  }
}

function readStoredUser(): User | null {
  const raw = safeStorage(() => localStorage.getItem(USER_KEY));
  if (!raw || !safeStorage(() => localStorage.getItem(TOKEN_KEY))) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function safeStorage<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}
