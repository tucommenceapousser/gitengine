/*
| Login stuff.
*/
'use strict';

def.attributes =
{
	// the place the page was created for
	place: { type: 'Yagit/Client/Place' },

	// the login button
	_buttonLogin: { type: [ 'undefined', 'protean' ] },

	// the potential error message
	_divError: { type: [ 'undefined', 'protean' ] },

	// the password input
	_inputPassword: { type: [ 'undefined', 'protean' ] },

	// the remember input
	_inputRemember: { type: [ 'undefined', 'protean' ] },

	// the user input
	_inputUsername: { type: [ 'undefined', 'protean' ] },
};

const Ajax = tim.require( 'Yagit/Client/Ajax' );
const ReplyError = tim.require( 'Yagit/Reply/Error' );
const ReplyLogin = tim.require( 'Yagit/Reply/Login' );
const RequestLogin = tim.require( 'Yagit/Request/Login' );

/*
| Received a login reply.
*/
def.proto.onLogin =
	function( request, reply )
{
	switch( reply.$type )
	{
		case 'ReplyError': reply = ReplyError.FromJson( reply ); break;
		case 'ReplyLogin': reply = ReplyLogin.FromJson( reply ); break;
		default: reply = ReplyError.Message( 'invalid reply' ); break;
	}

	this._buttonLogin.disabled = false;
	this._inputPassword.disabled = false;
	this._inputRemember.disabled = false;
	this._inputUsername.disabled = false;

	if( !this._inputRemember.checked )
	{
		window.localStorage.removeItem( 'username' );
	}

	if( reply.timtype === ReplyError )
	{
		this._divError.textContent = reply.message;
		this._inputPassword.value = '';
		this._inputPassword.focus( );
		return;
	}

	// XXX
	// root.create( 'session', reply.session );

	if( this._inputRemember.checked )
	{
		window.localStorage.setItem( 'username', this._inputPassword.value );
		//window.localStorage.setItem( 'session', reply.session );
	}

	console.log( 'TELEPORT' );
	//root.teleport( this.place );
};

/*
| Requests a login.
*/
def.proto.requestLogin =
	function( )
{
	const password = this._inputPassword.value;
	const remember = this._inputRemember.checked;
	const username = this._inputUsername.value.trim( );

	if( username === '' )
	{
		this.domErrorTd.textContent = 'username must not be empty';
		return;
	}

	if( password === '' )
	{
		this.domErrorTd.textContent = 'password must not be empty';
		return;
	}

	this._buttonLogin.disabled = true;
	this._inputUsername.disabled = true;
	this._inputPassword.disabled = true;
	this._inputRemember.disabled = true;

	Ajax.request(
		RequestLogin.create(
			'password', password,
			'remember', remember,
			'username', username,
		),
		'pageLogin', 'onLogin'
	);
};


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

		const spanUsernameLabel = document.createElement( 'span' );
		spanUsernameLabel.id = 'loginSpanUsernameLabel';
		spanUsernameLabel.textContent = 'username';
		const inputUsername =document.createElement( 'input' );
		inputUsername.id = 'loginInputUsername';

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
			spanUsernameLabel,
			inputUsername,
			spanPasswordLabel,
			inputPassword,
			buttonLogin,
			divRememberLine,
		);

		document.body.replaceChildren( h1, divLogin );

		inputUsername.onkeydown = ( event ) =>
		{
			if( event.keyCode === 13 ) root.pageLogin._inputPassword.focus( );
		};

		inputPassword.onkeydown = ( event ) =>
		{
			if( event.keyCode === 13 ) root.pageLogin.requestLogin( );
		};

		buttonLogin.onclick = ( ) =>
		{
			root.pageLogin.requestLogin( );
		};

		let self =
			this.create(
				'_buttonLogin', buttonLogin,
				'_divError', divError,
				'_inputPassword', inputPassword,
				'_inputRemember', inputRemember,
				'_inputUsername', inputUsername,
			);

		root.create( 'pageLogin', self );
	}
};
