import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BakerDashboardComponent } from './baker-dashboard.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('BakerDashboardComponent', () => {
  let component: BakerDashboardComponent;
  let fixture: ComponentFixture<BakerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BakerDashboardComponent, RouterTestingModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BakerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial orders', () => {
    expect(component.orders().length).toBeGreaterThan(0);
  });
});
