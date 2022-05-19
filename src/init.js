'use strict';

if( !global.tim ) require( '@timberdoodle/tim' );
require( '@csc1/passlock' );

module.exports =
	tim
	.register( 'gitengine', module, 'src/', 'init.js' )
	.require( 'Self.js' );
