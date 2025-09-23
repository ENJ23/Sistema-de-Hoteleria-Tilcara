import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioOcupacionComponent } from './calendario-ocupacion.component';

describe('CalendarioOcupacionComponent', () => {
  let component: CalendarioOcupacionComponent;
  let fixture: ComponentFixture<CalendarioOcupacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarioOcupacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarioOcupacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
