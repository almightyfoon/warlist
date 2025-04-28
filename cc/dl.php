<?php
header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

//session_start();

$mysqli = getDB();

$uid = getUid($mysqli, $_POST['type'], $_POST['id']);
$index = $mysqli->escape_string($_POST['index']);

if( $uid > 0 ) 
{
	$mysqli->query("DELETE FROM saved_lists WHERE uid=$uid AND offset=$index;");

	echo 'OK';
}


?>

