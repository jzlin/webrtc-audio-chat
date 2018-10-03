import { TestBed, inject } from '@angular/core/testing';

import { WebrtcService } from './webrtc.service';

describe('WebrtcService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WebrtcService]
    });
  });

  it('should be created', inject([WebrtcService], (service: WebrtcService) => {
    expect(service).toBeTruthy();
  }));
});
