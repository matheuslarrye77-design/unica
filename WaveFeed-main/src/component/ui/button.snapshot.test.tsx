import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button Snapshot Tests', () => {
	it('should match snapshot for button variants', () => {
		const { container: defaultBtn } = render(
			<Button variant="default">Default Button</Button>
		);
		expect(defaultBtn.firstChild).toMatchSnapshot('button-default-variant');

		const { container: outlineBtn } = render(
			<Button variant="outline">Outline Button</Button>
		);
		expect(outlineBtn.firstChild).toMatchSnapshot('button-outline-variant');
	});

	it('should match snapshot for button sizes', () => {
		const { container: smallBtn } = render(
			<Button size="sm">Small Button</Button>
		);
		expect(smallBtn.firstChild).toMatchSnapshot('button-small-size');

		const { container: largeBtn } = render(
			<Button size="lg">Large Button</Button>
		);
		expect(largeBtn.firstChild).toMatchSnapshot('button-large-size');
	});
});
