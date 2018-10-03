import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss']
})
export class StartComponent {
  roomName: string;

  constructor(private router: Router) { }

  onSubmit(form: NgForm) {
    console.log('invalid:', form.invalid);
    if (form.invalid) {
      return;
    }

    this.router.navigate(['room', this.roomName || '']);
  }

}
