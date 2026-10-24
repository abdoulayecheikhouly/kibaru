import { Component, input, output } from '@angular/core';
import { QuoteItem } from '../../models';
import { money } from '../../store';
@Component({
  selector: 'app-cart-item',
  templateUrl: './cart-item.html',
  styleUrl: './cart-item.css',
})
export class CartItem {
  item = input.required<QuoteItem>();
  quantityChange = output<number>();
  money = money;
}
