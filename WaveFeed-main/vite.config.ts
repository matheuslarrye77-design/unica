import { tanstackRouterGenerator } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tanstackRouterGenerator({
			// Включаем автогенерацию шаблонов для новых маршрутов
			enableRouteGeneration: true,
			// Кастомный шаблон для новых маршрутов
			customScaffolding: {
				routeTemplate: `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('{{fullPath}}')({
\tcomponent: RouteComponent
})

function RouteComponent() {
\treturn <div>{{routeName}} Page</div>
}
`
			}
		})
	],

	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src')
		}
	}
});
