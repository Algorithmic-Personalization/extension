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
	<div onClick={handleRecommendationClicked}>
		<a href={rec.url}>
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
						}}
					/>
				</Box>
				<Box>
					<Typography variant='body2' component='span'>
						{rec.title}
					</Typography>
				</Box>
			</Box>
		</a>
	</div>
);

export default RecommendationC;
