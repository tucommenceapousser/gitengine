/*
| Offers logging facilities for SSH server.
*/

// XXX REMOVE!

def.abstract = true;

const fs = require( 'fs' );
const util = require( 'util' );

/*
| Turn this on/off.
*/
//def.static.debugging = true;
def.static.debugging = false;

/*
| Logs only if not debugging.
*/
def.static.debug =
	function( ...args )
{
	console.log.apply( console.log, args );
	if( !Self.debugging ) return;
	Self._logStream._.write( (new Date()).toLocaleString('de') + ' ' + util.format.apply( null, args ) + '\n' );
};

/*
| Logs to stream.
*/
def.static.log =
	function( ...args )
{
	Self._logStream._.write( (new Date()).toLocaleString('de') + ' ' + util.format.apply( null, args ) + '\n' );
};

/*
| Logs to stream and console.
*/
def.static.both =
	function( ...args )
{
	console.log.apply( console.log, args );
	Self._logStream._.write( (new Date()).toLocaleString('de') + ' ' + util.format.apply( null, args ) + '\n' );
};

/*
| The log stream.
*/
def.staticLazy._logStream =
	function( )
{
	// works around immuting.
	return { '_': fs.createWriteStream( 'sshlog', { flags: 'a' } ) };
};

