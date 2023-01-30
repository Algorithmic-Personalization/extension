import {createTheme} from '@mui/material';

const isDarkMode = Boolean(document.querySelector('html[dark]'));

export const theme = createTheme({
	palette: {
		mode: isDarkMode ? 'dark' : 'light',
	},
});

theme.typography.h1 = {
	fontSize: '14px',
	color: isDarkMode ? 'rgb(241, 241, 241)' : 'rgb(15, 15, 15)',
	fontWeight: 500,
	fontFamily: 'Roboto, Arial, sans-serif',
	textOverflow: 'ellipsis',
	lineHeight: '20px',
};

theme.typography.body1 = {
	fontSize: '12px',
	color: isDarkMode ? 'rgb(170, 170, 170)' : 'rgb(96, 96, 96)',
	fontWeight: 400,
	fontFamily: 'Roboto, Arial, sans-serif',
	textOverflow: 'ellipsis',
	lineHeight: '18px',

};

export default theme;
