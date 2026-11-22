import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProfessionalProfile, Recommendation } from '../models/recommendation.model';
import { CostInputs } from '../../shared/cost-calculator';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/v1/quotes`;
  profile() { return this.http.get<ProfessionalProfile>(`${this.api}/profile`); }
  save(profile: ProfessionalProfile) { return this.http.put<ProfessionalProfile>(`${this.api}/profile`, profile); }
  clearHistory() { return this.http.delete(`${this.api}/history`); }
  calculate(orderId: string, costs: CostInputs, mode: 'adaptive' | 'baseline') {
    return this.http.post<Recommendation>(`${this.api}/recommend/${orderId}`, { ...costs, mode });
  }
}
