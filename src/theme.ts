import {createTheme} from '@mui/material';

export const theme = createTheme({});

theme.typography.h1 = {
    fontSize: '14px',
    color: 'rgb(15, 15, 15)',
    fontWeight: 500,
    fontFamily: 'Roboto, Arial, sans-serif',
    textOverflow: 'ellipsis',
    lineHeight: '20px',
};

theme.typography.body1 = {
    fontSize: '12px',
    color: 'rgb(96, 96, 96)',
    fontWeight: 400,
    fontFamily: 'Roboto, Arial, sans-serif',
    textOverflow: 'ellipsis',
    lineHeight: '18px',

};

export default theme;
