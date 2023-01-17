import React from 'react';

import {
	Box,
	Typography,
} from '@mui/material';

import type Recommendation from '../models/Recommendation';

export const RecommendationC: React.FC<Recommendation & {handleRecommendationClicked: () => Promise<void>}> = ({
	handleRecommendationClicked,
	...rec
}) => (
	<Box
		onClick={handleRecommendationClicked}
		sx={{
			mb: 2,
		}}
	>
		<a href={rec.url}
			style={{
				textDecoration: 'none',
			}}
		>
			<Box sx={{
				display: 'flex',
			}}>
				<Box sx={{mr: 2}}>
					<Box
						component='img'
						alt={rec.title}
						className='yt-core-image--fill-parent-height yt-core-image--fill-parent-width yt-core-image yt-core-image--content-mode-scale-aspect-fill yt-core-image--loaded'
						src={rec.miniatureUrl}
						sx={{
							width: 168,
							height: 94,
							borderRadius: 2,
						}}
					/>
				</Box>
				<Box>
					<Typography
						variant='h1'
						component='div'
						sx={{
							mb: 1,
						}}
					>
						{rec.title}
					</Typography>
					<Typography
						variant='body1'
						component='div'
					>
						{rec.channelName}
					</Typography>
					<Typography
						variant='body1'
						component='div'
					>{rec.views}&nbsp;•&nbsp;{rec.publishedSince}</Typography>
				</Box>
			</Box>
		</a>
	</Box>
);

export default RecommendationC;
