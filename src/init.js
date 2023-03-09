'use strict';

// global ti2c options
if( global.NODE === undefined ) global.NODE = true;
if( global.CHECK === undefined ) global.CHECK = true;

//if( !global.ti2c ) require( 'ti2c' );

//require( 'ti2c-web' );
require( '@csc1/passlock' );

module.exports.init =
	async ( ) =>
{
	const pkg = await ti2c.register( 'gitengine', module, 'src/', 'init.js' );
	const gitengine = await pkg.import( 'Self.js' );
	gitengine._init( pkg.dir );

	for( let key of Object.keys( gitengine ) )
	{
		module.exports[ key ] = gitengine[ key ];
	}
};
