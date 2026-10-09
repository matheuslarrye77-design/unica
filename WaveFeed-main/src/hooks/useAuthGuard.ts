import type { RootState } from '@/store';
import { useSelector } from 'react-redux';

export const useAuthGuard = () => {
	const isAuth = useSelector((state: RootState) => state.auth.isAuthenticated);

	return isAuth;
};
