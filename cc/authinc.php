<?php

require_once '/home/conflic1/public_html/vendor/autoload.php';

function getDB()
{
	return new mysqli("localhost", "conflic1_user", "", "conflic1_main");
}

function getUid($mysqli, $type, $token)
{
	$uid = null;
	$gid = null;
	$client = null;
	$data = null;

	// echo $type . "\n";
	// echo $token . "\n";

	if( $type == 'fb' )
	{
		// echo "Attempting facebook stuff.\n";

		try
		{
			$fb = new Facebook\Facebook([
				'app_id' => '1825213381039783',
				'default_graph_version' => 'v2.5'
			]);
		}
		catch(Exception $e)
		{
			echo 'Exception getting FB object';
			return -1;
		}

		

		// echo "Facebook stuff done\n";
		// echo $token;
		// echo "\n";


		try
		{
			$response = $fb->get('/me?fields=id', $token);
			$user = $response->getGraphUser();
		}
		catch(Exception $e)
		{
			echo 'Exception getting FB data';
			return -1;
		}

		//echo $user['id'] . "\n";

		$gid = 'f' . $user['id'];

	}
	else if( $type == 'g' )
	{
		$client = new Google_Client();
		$client->setAuthConfigFile('/home/conflic1/client_secret.json');

		$ticket = $client->verifyIdToken($token);
		$data = $ticket->getAttributes()['payload'];

		$gid = $mysqli->escape_string($data['sub']);
	}
	else 
	{
		return null;
	}

	if( $gid == null )
	{
		return null;
	}

	$q = "SELECT * FROM google_login WHERE gid='$gid';";

	$result = null;

	try
	{
		$result = $mysqli->query($q);
	}
	catch(Exception $e)
	{
		echo "Exception: " . $e->getMessage() . "\n";
	}

	if( $result && $row = $result->fetch_assoc() )
	{
		$uid = $row['uid'];
	}
	else
	{
		$email = '';
		$name = '';
		$picture = '';

		if( $type == 'fb' )
		{
			$response = $fb->get('/me?fields=id,name,picture,email', $token);
			$user = $response->getGraphUser();

			$name = $user['name'];
			$email = $user['email'];

			$picture = null;

			$ob = $user['picture'];

			if( $ob != null )
				$picture = $ob->getUrl();
		}
		else if( $type == 'g')
		{
			$name = $data['name'];
			$email = $data['email'];
			$picture = $data['picture'];
		}

		//echo "new user -- $gid\n";

		$q = ("INSERT INTO google_login(gid, email, name, pic) VALUES('$gid', "
			. "'" . $mysqli->escape_string($email) . "'"
			. ", '" . $mysqli->escape_string($name) . "'"
			. ", '" . $mysqli->escape_string($picture) . "'"
			. ");");

		//echo $q . "\n";
		$mysqli->query($q);

		$uid = $mysqli->insert_id;
	}

	return $uid;
}


?>
