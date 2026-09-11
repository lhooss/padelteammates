import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { LoginInput, RegisterRequest, UpdateProfileInput } from '@padelteammates/shared';

import type {
  AuthResponse,
  Club,
  CreateMatchRequest,
  FriendRequests,
  FriendshipState,
  JoinRequest,
  Match,
  PlayerProfile,
  PlayerSearchResult,
  PlayerSummary,
  Score,
  ScoreDetail,
  Team,
  User,
  ValidateScoreResponse,
} from '@/api/types';
import { API_URL } from '@/config/api-url';

import { signedOut } from './auth-slice';

type WithAuth = { auth: { token: string | null } };

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api`,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as WithAuth).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Un 401 sur une requete authentifiee = jeton expire ou invalide : on deconnecte.
// (Un 401 au login, sans jeton, reste une simple erreur d'identifiants.)
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  const hadToken = Boolean((api.getState() as WithAuth).auth.token);
  const result = await rawBaseQuery(args, api, extra);
  if (result.error?.status === 401 && hadToken) api.dispatch(signedOut());
  return result;
};

// Toute action d'amitie change les listes d'amis et la relation affichee sur les profils.
const FRIENDSHIP_TAGS = ['Friend', 'Player'] as const;

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Match', 'Club', 'Friend', 'Player'],
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: build.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    me: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    updateMe: build.mutation<User, UpdateProfileInput>({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),

    clubs: build.query<Club[], void>({
      query: () => '/clubs',
      providesTags: ['Club'],
    }),

    weeklyCalendar: build.query<Match[], { from: string; clubId?: string }>({
      query: ({ from, clubId }) => ({
        url: '/matches/calendar/weekly',
        params: clubId ? { from, clubId } : { from },
      }),
      providesTags: ['Match'],
    }),
    myMatches: build.query<Match[], void>({
      query: () => '/matches/mine',
      providesTags: ['Match'],
    }),
    match: build.query<Match, string>({
      query: (id) => `/matches/${id}`,
      providesTags: ['Match'],
    }),
    createMatch: build.mutation<Match, CreateMatchRequest>({
      query: (body) => ({ url: '/matches', method: 'POST', body }),
      invalidatesTags: ['Match'],
    }),
    invitePlayers: build.mutation<Match, { matchId: string; invites: { userId: string; team: Team }[] }>({
      query: ({ matchId, invites }) => ({ url: `/matches/${matchId}/invites`, method: 'POST', body: { invites } }),
      invalidatesTags: ['Match'],
    }),
    respondInvite: build.mutation<Match, { matchId: string; accept: boolean }>({
      query: ({ matchId, accept }) => ({
        url: `/matches/${matchId}/respond`,
        method: 'POST',
        body: { accept },
      }),
      invalidatesTags: ['Match'],
    }),

    // Demandes pour rejoindre : demander une place, accepter (organisateur),
    // refuser (organisateur) ou annuler (demandeur).
    requestToJoin: build.mutation<JoinRequest, { matchId: string; team: Team }>({
      query: ({ matchId, team }) => ({ url: `/matches/${matchId}/join-requests`, method: 'POST', body: { team } }),
      invalidatesTags: ['Match'],
    }),
    acceptJoinRequest: build.mutation<Match, { matchId: string; userId: string }>({
      query: ({ matchId, userId }) => ({ url: `/matches/${matchId}/join-requests/${userId}/accept`, method: 'POST' }),
      invalidatesTags: ['Match'],
    }),
    removeJoinRequest: build.mutation<void, { matchId: string; userId: string }>({
      query: ({ matchId, userId }) => ({ url: `/matches/${matchId}/join-requests/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Match'],
    }),

    // Saisie (ou correction) du score : compte comme la validation de son equipe.
    submitScore: build.mutation<Score, { matchId: string; body: ScoreDetail }>({
      query: ({ matchId, body }) => ({ url: `/matches/${matchId}/score`, method: 'POST', body }),
      invalidatesTags: ['Match'],
    }),
    // Validation : peut verrouiller le match et mettre a jour les stats (profil, joueurs).
    validateScore: build.mutation<ValidateScoreResponse, string>({
      query: (matchId) => ({ url: `/matches/${matchId}/score/validate`, method: 'POST' }),
      invalidatesTags: ['Match', 'Me', 'Player'],
    }),

    searchPlayers: build.query<PlayerSearchResult[], string>({
      query: (q) => ({ url: '/users/search', params: { q } }),
      providesTags: ['Player'],
    }),
    player: build.query<PlayerProfile, string>({
      query: (id) => `/users/${id}`,
      providesTags: ['Player'],
    }),
    friends: build.query<PlayerSummary[], void>({
      query: () => '/friends',
      providesTags: ['Friend'],
    }),
    friendRequests: build.query<FriendRequests, void>({
      query: () => '/friends/requests',
      providesTags: ['Friend'],
    }),
    sendFriendRequest: build.mutation<{ state: FriendshipState }, string>({
      query: (userId) => ({ url: `/friends/${userId}`, method: 'POST' }),
      invalidatesTags: [...FRIENDSHIP_TAGS],
    }),
    acceptFriendRequest: build.mutation<{ state: FriendshipState }, string>({
      query: (userId) => ({ url: `/friends/${userId}/accept`, method: 'POST' }),
      invalidatesTags: [...FRIENDSHIP_TAGS],
    }),
    removeFriend: build.mutation<{ state: FriendshipState }, string>({
      query: (userId) => ({ url: `/friends/${userId}`, method: 'DELETE' }),
      invalidatesTags: [...FRIENDSHIP_TAGS],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useMeQuery,
  useUpdateMeMutation,
  useClubsQuery,
  useWeeklyCalendarQuery,
  useMyMatchesQuery,
  useMatchQuery,
  useCreateMatchMutation,
  useInvitePlayersMutation,
  useRespondInviteMutation,
  useRequestToJoinMutation,
  useAcceptJoinRequestMutation,
  useRemoveJoinRequestMutation,
  useSubmitScoreMutation,
  useValidateScoreMutation,
  useSearchPlayersQuery,
  usePlayerQuery,
  useFriendsQuery,
  useFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRemoveFriendMutation,
} = api;
