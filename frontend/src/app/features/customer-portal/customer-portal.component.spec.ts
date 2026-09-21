import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomerPortalComponent } from './customer-portal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('CustomerPortalComponent', () => {
  let component: CustomerPortalComponent;
  let fixture: ComponentFixture<CustomerPortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerPortalComponent, HttpClientTestingModule, RouterTestingModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CustomerPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should correctly set initial loading state to false', () => {
    expect(component.loading()).toBeFalse();
  });
});
