import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toastCtrl = inject(ToastController);

  async show(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'medium' = 'medium',
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom',
    });
    await toast.present();
  }
}
