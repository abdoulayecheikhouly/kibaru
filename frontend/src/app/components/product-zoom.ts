import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
@Component({
  selector: 'app-product-zoom',
  imports: [MatDialogModule],
  template: `<h2 mat-dialog-title>{{ data.name }}</h2>
    <mat-dialog-content
      ><img class="zoom-image" [src]="selected()" [alt]="data.name" />
      <div class="photo-thumbnails">
        @for (image of data.images; track image; let i = $index) {
          <button
            type="button"
            [attr.aria-label]="'Agrandir la photo ' + (i + 1)"
            [attr.aria-pressed]="selected() === image"
            (click)="selected.set(image)"
          >
            <img [src]="image" alt="" />
          </button>
        }</div
    ></mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button class="dark" mat-dialog-close>Fermer</button></mat-dialog-actions
    >`,
})
export class ProductZoom {
  data = inject<{ images: string[]; name: string; selected: string }>(MAT_DIALOG_DATA);
  selected = signal(this.data.selected);
}
