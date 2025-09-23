import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs/operators';

interface User {
  rol: string;
  [key: string]: any;
}

@Directive({
  selector: '[appRole]'
})
export class RoleDirective implements OnInit {
  @Input() appRole: string | string[] = [];
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(take(1))
      .subscribe((user: User | null) => {
        if (!user) {
          this.viewContainer.clear();
          this.hasView = false;
          return;
        }

        const userRole = user.rol;
        const requiredRoles = Array.isArray(this.appRole) ? this.appRole : [this.appRole];
        const hasRequiredRole = requiredRoles.some(role => role === userRole);

        if (hasRequiredRole && !this.hasView) {
          this.viewContainer.createEmbeddedView(this.templateRef);
          this.hasView = true;
        } else if (!hasRequiredRole && this.hasView) {
          this.viewContainer.clear();
          this.hasView = false;
        }
      });
  }
}
