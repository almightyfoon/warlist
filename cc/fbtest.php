<?php

require_once '/home/conflic1/public_html/vendor/autoload.php';


		try
		{
			$fb = new Facebook\Facebook([
				'app_id' => '1825213381039783',
				'default_graph_version' => 'v2.5'
			]);
            

            echo 'Got FB2<br>';

			$response = $fb->get('/50164954847?fields=id,name,cover,single_line_address,picture,link,location', '');

			echo 'GotResponse3<br>';

			echo '<pre>';
            print_r($response);
			echo '</pre>';

			echo '<br>';

			echo $response->getBody();
			echo '<br>';

            

		}
		catch(Exception $e)
		{
			echo 'Exception getting FB object<br>';
			echo '<pre>';
			print_r($e);
			echo '</pre>';
			return -1;
		}


?>
