import React from 'react';
import {Typography} from '@mui/material';

import type Recommendation from '../common/types/Recommendation';

export const HomeVideoCard: React.FC<Recommendation & {onClick: () => Promise<void>}> = ({
	videoId,
	title,
// eslint-disable-next-line arrow-body-style
}) => {
	return (<div className='style-scope ytd-rich-item-renderer'>
		<div className='style-scope ytd-rich-grid-media'>
			<div className='style-scope ytd-rich-grid-media'>
				<a
					className='yt-simple-endpoint inline-block style-scope ytd-thumbnail'
					href={`/watch?v=${videoId}`}
				>
					<div className='style-scope ytd-thumbnail'>
						<img
							style={{
								backgroundColor: 'transparent',
								borderRadius: 12,
							}}
							className='yt-core-image--fill-parent-height yt-core-image--fill-parent-width yt-core-image yt-core-image--content-mode-scale-aspect-fill yt-core-image--loaded'
							src={`https://i.ytimg.com/vi/${videoId}/hq720.jpg`}
						/>
					</div>
				</a>
			</div>
		</div>
		{/* TODO: missing link to channel */}
		<div className='style-scope ytd-rich-grid-media'>
			<div className='style-scope ytd-rich-grid-media'>
				<h3 className='style-scope ytd-rich-grid-media'>
					<a
						className='yt-simple-endpoint focus-on-expand style-scope ytd-rich-grid-media'
						href={`/watch?v=${videoId}`}
						title={title}
					>
						<div className='style-scope ytd-rich-grid-media'>
							<Typography variant='h3' component='h3'>
								{title}
							</Typography>
						</div>
					</a>
				</h3>
			</div>
		</div>
	</div>);
};

export default HomeVideoCard;
