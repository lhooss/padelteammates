import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type {
  ChangeEmailInput,
  ChangePasswordInput,
  FrmtCategory,
  FrmtLinkInput,
  LoginInput,
  RegisterRequest,
  UpdateProfileRequest,
} from '@padelteammates/shared';

import type {
  AppNotification,
  AuthResponse,
  Club,
  CreateMatchRequest,
  FriendRequests,
  FriendshipState,
  FrmtImportRun,
  FrmtImportStatus,
  FrmtPendingLink,
  FrmtRankingEntry,
  FrmtSummary,
  JoinRequest,
  Match,
  MatchVisibility,
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

import { signedIn, signedOut } from './auth-slice';

type WithAuth = { auth: { token: string | null; refreshToken: string | null } };

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api`,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as WithAuth).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Le jeton d'acces expire au bout de quelques minutes : plutot que de deconnecter le
// joueur, on echange le jeton de session contre un nouveau couple et on rejoue la
// requete. Un seul renouvellement a la fois, sinon dix requetes simultanees en
// lanceraient dix, et la rotation en invaliderait neuf.
let renewal: Promise<boolean> | null = null;

function isRefreshCall(args: string | FetchArgs): boolean {
  const url = typeof args === 'string' ? args : args.url;
  return url === '/auth/refresh';
}

async function renewSession(
  api: Parameters<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>[1],
  extra: Parameters<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>[2],
): Promise<boolean> {
  const refreshToken = (api.getState() as WithAuth).auth.refreshToken;
  if (!refreshToken) return false;

  const response = await rawBaseQuery({ url: '/auth/refresh', method: 'POST', body: { refreshToken } }, api, extra);
  const session = response.data as AuthResponse | undefined;
  if (!session?.token) return false;

  // Passe par signedIn : la session persistee suit le dernier couple recu.
  api.dispatch(signedIn({ token: session.token, refreshToken: session.refreshToken }));
  return true;
}

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  const hadToken = Boolean((api.getState() as WithAuth).auth.token);
  let result = await rawBaseQuery(args, api, extra);

  // Un 401 sans jeton (ex. mauvais identifiants au login) reste une erreur normale.
  // Un 401 sur /auth/refresh signifie que la session longue est finie : on ne boucle pas.
  if (result.error?.status === 401 && hadToken && !isRefreshCall(args)) {
    renewal ??= renewSession(api, extra).finally(() => {
      renewal = null;
    });
    if (await renewal) result = await rawBaseQuery(args, api, extra);
    else api.dispatch(signedOut());
  }

  return result;
};

// Toute action d'amitie change les listes d'amis et la relation affichee sur les profils.
const FRIENDSHIP_TAGS = ['Friend', 'Player'] as const;
// Un lien FRMT change mon profil, celui vu par les autres et les listes FRMT.
const FRMT_LINK_TAGS = ['Me', 'Player', 'Frmt'] as const;

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Match', 'Club', 'Friend', 'Player', 'Frmt', 'Notification'],
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: build.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    // Disponibilite d'un identifiant pendant l'inscription : appelee avant
    // d'avoir un compte, donc sans jeton. `suggestion` est toujours libre.
    checkUsername: build.query<{ available: boolean; suggestion: string }, string>({
      query: (username) => ({ url: '/auth/username', params: { username } }),
    }),
    // Mot de passe oublie : un code est envoye par email. La reponse est la meme
    // que l'adresse existe ou non, pour ne rien reveler.
    forgotPassword: build.mutation<void, string>({
      query: (email) => ({ url: '/auth/forgot-password', method: 'POST', body: { email } }),
    }),
    resetPassword: build.mutation<void, { email: string; code: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    // Deconnexion : revoque la session de cet appareil cote serveur.
    logout: build.mutation<void, string>({
      query: (refreshToken) => ({ url: '/auth/logout', method: 'POST', body: { refreshToken } }),
    }),
    me: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    // Profil : nom, profil public, profil padel, club habituel, telephone.
    updateMe: build.mutation<User, UpdateProfileRequest>({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      invalidatesTags: ['Me', 'Player'],
    }),
    changeEmail: build.mutation<User, ChangeEmailInput>({
      query: (body) => ({ url: '/auth/me/email', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    changePassword: build.mutation<void, ChangePasswordInput>({
      query: (body) => ({ url: '/auth/me/password', method: 'PATCH', body }),
    }),

    clubs: build.query<Club[], void>({
      query: () => '/clubs',
      providesTags: ['Club'],
    }),
    // Administration : la liste inclut les clubs desactives.
    allClubs: build.query<Club[], void>({
      query: () => ({ url: '/clubs', params: { includeInactive: 'true' } }),
      providesTags: ['Club'],
    }),
    createClub: build.mutation<Club, { name: string; city?: string }>({
      query: (body) => ({ url: '/clubs', method: 'POST', body }),
      invalidatesTags: ['Club'],
    }),
    // Renommer, deplacer, desactiver ou reactiver un club.
    updateClub: build.mutation<Club, { id: string; name?: string; city?: string; active?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/clubs/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Club'],
    }),
    // Refuse par l'API (409) des que le club a des matchs : on le desactive alors.
    deleteClub: build.mutation<void, string>({
      query: (id) => ({ url: `/clubs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Club'],
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

    // Visibilite du match, changee par l'organisateur.
    setMatchVisibility: build.mutation<Match, { matchId: string; visibility: MatchVisibility }>({
      query: ({ matchId, visibility }) => ({
        url: `/matches/${matchId}/visibility`,
        method: 'PATCH',
        body: { visibility },
      }),
      invalidatesTags: ['Match'],
    }),
    // Reservation du terrain au club, confirmee par n'importe quel joueur du match.
    setCourtBooking: build.mutation<Match, { matchId: string; booked: boolean }>({
      query: ({ matchId, booked }) => ({ url: `/matches/${matchId}/booking`, method: 'POST', body: { booked } }),
      invalidatesTags: ['Match'],
    }),
    // Annulation par l'organisateur : le match disparait pour tout le monde.
    cancelMatch: build.mutation<void, string>({
      query: (matchId) => ({ url: `/matches/${matchId}`, method: 'DELETE' }),
      invalidatesTags: ['Match'],
    }),
    // Quitter un match, ou (organisateur) en retirer un joueur.
    leaveMatch: build.mutation<Match, { matchId: string; userId: string }>({
      query: ({ matchId, userId }) => ({ url: `/matches/${matchId}/participants/${userId}`, method: 'DELETE' }),
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

    // --- Notifications in-app ---
    notifications: build.query<AppNotification[], void>({
      query: () => '/notifications',
      providesTags: ['Notification'],
    }),
    markNotificationRead: build.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
    // Notifications push : l'appareil s'enregistre a la connexion, se retire a la deconnexion.
    registerPushToken: build.mutation<void, { token: string; platform: 'android' | 'ios' }>({
      query: (body) => ({ url: '/notifications/push-tokens', method: 'PUT', body }),
    }),
    removePushToken: build.mutation<void, string>({
      query: (token) => ({ url: `/notifications/push-tokens/${encodeURIComponent(token)}`, method: 'DELETE' }),
    }),
    markAllNotificationsRead: build.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),

    // --- Classement FRMT ---
    frmtStatus: build.query<FrmtImportStatus, void>({
      query: () => '/frmt/status',
      providesTags: ['Frmt'],
    }),
    frmtSearch: build.query<FrmtRankingEntry[], { q: string; category?: FrmtCategory }>({
      query: ({ q, category }) => ({ url: '/frmt/ranking', params: category ? { q, category } : { q } }),
      providesTags: ['Frmt'],
    }),
    linkFrmt: build.mutation<FrmtSummary, FrmtLinkInput>({
      query: (body) => ({ url: '/frmt/link', method: 'PUT', body }),
      invalidatesTags: [...FRMT_LINK_TAGS],
    }),
    unlinkFrmt: build.mutation<void, void>({
      query: () => ({ url: '/frmt/link', method: 'DELETE' }),
      invalidatesTags: [...FRMT_LINK_TAGS],
    }),
    // Administration : demandes a valider, import immediat.
    frmtPendingLinks: build.query<FrmtPendingLink[], void>({
      query: () => '/frmt/links',
      providesTags: ['Frmt'],
    }),
    verifyFrmtLink: build.mutation<FrmtSummary, string>({
      query: (linkId) => ({ url: `/frmt/links/${linkId}/verify`, method: 'POST' }),
      invalidatesTags: [...FRMT_LINK_TAGS],
    }),
    rejectFrmtLink: build.mutation<void, string>({
      query: (linkId) => ({ url: `/frmt/links/${linkId}`, method: 'DELETE' }),
      invalidatesTags: [...FRMT_LINK_TAGS],
    }),
    importFrmt: build.mutation<FrmtImportRun, void>({
      query: () => ({ url: '/frmt/import', method: 'POST' }),
      invalidatesTags: [...FRMT_LINK_TAGS],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useCheckUsernameQuery,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useMeQuery,
  useUpdateMeMutation,
  useChangeEmailMutation,
  useChangePasswordMutation,
  useClubsQuery,
  useAllClubsQuery,
  useCreateClubMutation,
  useUpdateClubMutation,
  useDeleteClubMutation,
  useWeeklyCalendarQuery,
  useMyMatchesQuery,
  useMatchQuery,
  useCreateMatchMutation,
  useInvitePlayersMutation,
  useRespondInviteMutation,
  useSetMatchVisibilityMutation,
  useSetCourtBookingMutation,
  useCancelMatchMutation,
  useLeaveMatchMutation,
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
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useRegisterPushTokenMutation,
  useRemovePushTokenMutation,
  useFrmtStatusQuery,
  useFrmtSearchQuery,
  useLinkFrmtMutation,
  useUnlinkFrmtMutation,
  useFrmtPendingLinksQuery,
  useVerifyFrmtLinkMutation,
  useRejectFrmtLinkMutation,
  useImportFrmtMutation,
} = api;
