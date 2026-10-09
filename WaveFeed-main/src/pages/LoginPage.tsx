import { Link } from '@tanstack/react-router';
import Login from '../component/Login';

const LoginPage = () => {
	return (
		<>
			<Login />

			<h2>
				Don't have an account? <Link to="/register">Register</Link>
			</h2>
		</>
	);
};

export default LoginPage;
