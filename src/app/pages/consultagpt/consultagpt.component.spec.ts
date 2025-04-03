import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultagptComponent } from './consultagpt.component';

describe('ConsultagptComponent', () => {
  let component: ConsultagptComponent;
  let fixture: ComponentFixture<ConsultagptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultagptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsultagptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
