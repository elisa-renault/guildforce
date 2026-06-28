import { Navigate, useLocation, useParams } from 'react-router-dom';

export const GuildWishesRedirect = () => {
  const location = useLocation();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const searchParams = new URLSearchParams(location.search);
  if (!searchParams.has('edit')) {
    searchParams.set('edit', 'my-wishes');
  }
  const query = searchParams.toString();
  const rosterPath = regionSlug && serverSlug && guildSlug
    ? `/guild/${regionSlug}/${serverSlug}/${guildSlug}/roster`
    : '/guilds';
  return <Navigate to={`${rosterPath}${query ? `?${query}` : ''}`} replace />;
};
