<?php
header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

$mysqli = getDB();

$uid = getUid($mysqli, $_POST['type'], $_POST['id']);
$name = $mysqli->escape_string($_POST['name']);

if( $uid > 0 ) 
{
	$stmt = $mysqli->prepare("INSERT INTO folders(name, owner, parent, special) VALUES(?, $uid, null, 0);");

	if( $stmt ) 
	{
		$stmt->bind_param("s", $name);	
		$stmt->execute();
		$stmt->close();

		echo $mysql->insert_id;
	}

	echo 'called3';
}
else 
{
	echo '-1';
}



?>

