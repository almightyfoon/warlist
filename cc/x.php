<?php

header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

$mysqli = getDB();

$uid = getUid($mysqli, $_POST['type'], $_POST['arg']);

if( $uid > 0 )
{
	$q = "SELECT offset, description, listdata, folder FROM saved_lists WHERE uid=$uid ORDER BY 1 ASC;";

	$result = $mysqli->query($q);

	$ret = array();

	while( $result && $row = $result->fetch_assoc() )
	{
		array_push($ret, $row);
	}

	$q = "SELECT uid, name, special FROM folders WHERE owner=$uid ORDER BY 1 ASC;";

	$result = $mysqli->query($q);

	$folders = array();

	while( $result && $row = $result->fetch_assoc() )
	{
		array_push($folders, $row);
	}

	$final = array(
		'folders' => $folders,
		'lists' => $ret
	);



	echo json_encode($final);
}

?>

