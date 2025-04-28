<?php
header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

//session_start();

$mysqli = getDB();
// echo $_POST['type'] . "\n";
// echo $_POST['id'] . "\n";

$uid = getUid($mysqli, $_POST['type'], $_POST['id']);
//echo $uid . "\n";





// $client = new Google_Client();
// $client->setAuthConfigFile('/home/conflic1/client_secret.json');

// $ticket = $client->verifyIdToken($_POST['id']);
// $data = $ticket->getAttributes()['payload'];


// $gid = $mysqli->escape_string($data['sub']);

//echo "a\n";
//echo $gid . "\n";

// $result = $mysqli->query("SELECT * FROM google_login WHERE gid='$gid';");

// $uid = null;

// if( $result && $row = $result->fetch_assoc() )
// {
// 	$uid = $row['uid'];
// }
// else
// {
// 	//echo "new user -- $gid\n";

// 	$q = ("INSERT INTO google_login(gid, email, name, pic) VALUES('$gid', "
// 		. "'" . $mysqli->escape_string($data['email']) . "'"
// 		. ", '" . $mysqli->escape_string($data['name']) . "'"
// 		. ", '" . $mysqli->escape_string($data['picture']) . "'"
// 		. ");");

// 	//echo $q . "\n";
// 	$mysqli->query($q);

// 	$uid = $mysqli->insert_id;
// }


$index = $mysqli->escape_string($_POST['index']);

if( $uid > 0 ) // && in_array($index, array('1', '2', '3', '4', '5', '6', '7', '8')))
{
	try
	{
		$mysqli->query("DELETE FROM saved_lists WHERE uid=$uid AND offset=$index;");

		$q = "INSERT INTO saved_lists(uid, offset, description, listdata) VALUES($uid, $index, '"
			. $mysqli->escape_string($_POST['desc']) . "', '" . $mysqli->escape_string($_POST['listdata']) ."');";
		$mysqli->query($q);
		
		echo 'OK';
	}
	catch(mysqli_sql_exception $e)
	{
		echo $e->errorMessage();
	}
		
	//echo "\n$q\n";
	//echo $_POST['listdata'];

}
else
{
	echo 'Bad user login id';
}

//echo json_encode($ticket->getAttributes()['payload']);

//$client->authenticate($_POST['arg']);


/*
echo getUserFromToken($_POST['arg']);
*/





?>

