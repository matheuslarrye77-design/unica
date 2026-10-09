import { createFileRoute } from '@tanstack/react-router';
import RegisterPage from '../pages/RegisterPage';

export const Route = createFileRoute('/register')({
	component: RouteComponent
});

function RouteComponent() {
	return <RegisterPage />;
}
