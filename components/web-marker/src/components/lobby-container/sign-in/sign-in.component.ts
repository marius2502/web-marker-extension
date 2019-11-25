import { LoginUserDto } from './../../../models/loginUserDto';
import { environment } from '../../../environments/environment.dev';
import { connect } from 'pwa-helpers';
import { store } from '../../../store/store';
import { JwtPayload } from '../../../models/jwtPayload';
import { css, customElement, html, LitElement, query, property, unsafeCSS } from 'lit-element';
import { UserService } from '../../../services/user.service';
import { navigateExternal } from '../../../helper/router';

const componentCSS = require('./sign-in.component.scss');

@customElement('sign-in')
class SignInComponent extends connect(store)(LitElement) {
	static styles = css`${unsafeCSS(componentCSS)}`;
	userService = new UserService();

	@property()
	formSuccess = false;

	@property()
	loading = false;

	@query('form')
	form!: HTMLFormElement;

	@query('#email')
	emailElement!: HTMLInputElement;

	@query('#password')
	passwordElement!: HTMLInputElement;

	async submit(e?: MouseEvent) {
		e.stopImmediatePropagation();
		e ? e.preventDefault() : '';
		let jwtToken = '';
		if (this.isFormValid()) {
			const signInData: LoginUserDto = {
				email: this.emailElement.value,
				password: this.passwordElement.value
			};
			try {
				this.loading = true;
				jwtToken = await this.userService.login(signInData);
				if (jwtToken) this.emitLogin();
			} catch (error) {
				//
			}
			this.loading = false;
		} else {
			this.form.classList.add('was-validated');
		}
	}

	emitLogin() {
		this.dispatchEvent(new CustomEvent('loggedIn', {
			bubbles: true,
		}));
	}

	isFormValid() {
		return this.form.checkValidity();
	}

	render() {
		return html`
					<form class="form">
						<input type="email" required id="email" name="email" placeholder="Email">
						<input type="password" required id="password" name="password" placeholder="Password">
						<button
						type="submit" id="login-button" @click=${(e: MouseEvent) => this.submit(e)}
						class="${this.loading ? 'loading' :

				''}"
				>${this.loading ? '...' : 'Sign In'}</button>
				</form>

`
	}

}