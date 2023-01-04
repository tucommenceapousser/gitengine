/*
| Login stuff.
*/
'use strict';

def.attributes =
{
	// the place the page was created for
	place: { type: 'Yagit/Client/Place' },
};

//const Ajax = tim.require( 'Data/Client/Ajax' );
//const ReplyError = tim.require( 'Data/Reply/Error' );
//const RequestLogin = tim.require( 'Data/Request/Login' );

/*
| Shows the login page.
*/
def.proto.show =
	function( )
{
	let divLogin = document.getElementById( 'divLogin' );

	if( !divLogin )
	{
		const h1 = document.createElement( 'h1' );
		h1.id = 'loginH1';
		h1.textContent = 'login';

		divLogin = document.createElement( 'div' );
		divLogin.id = 'loginDivLogin';

		const divError = document.createElement( 'div' );
		divError.id = 'loginDivError';
		divLogin.appendChild( divError );

		const spanUserLabel = document.createElement( 'span' );
		spanUserLabel.id = 'loginSpanUserLabel';
		spanUserLabel.textContent = 'username';
		const inputUser =document.createElement( 'input' );
		inputUser.id = 'loginInputUser';

		const spanPasswordLabel = document.createElement( 'span' );
		spanPasswordLabel.id = 'loginSpanPasswordLabel';
		spanPasswordLabel.textContent = 'password';
		const inputPassword =document.createElement( 'input' );
		inputPassword.id = 'loginInputPassword';
		inputPassword.type = 'password';

		const buttonLogin = document.createElement( 'button' );
		buttonLogin.id = 'loginButtonLogin';
		buttonLogin.textContent = 'login';

		const divRememberLine = document.createElement( 'div' );
		divRememberLine.id = 'loginDivRememberLine';
		const inputRemember = document.createElement( 'input' );
		inputRemember.id = 'loginInputRemember';
		inputRemember.type = 'checkbox';
		inputRemember.checked = true;
		const spanRemember = document.createElement( 'span' );
		spanRemember.textContent = 'remember me';
		divRememberLine.replaceChildren( inputRemember, spanRemember );

		divLogin.replaceChildren(
			divError,
			spanUserLabel,
			inputUser,
			spanPasswordLabel,
			inputPassword,
			buttonLogin,
			divRememberLine,
		);

		document.body.replaceChildren( h1, divLogin );
	}
};
