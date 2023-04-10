import { useGetForumCategoryQuery } from '@/forum/queries'
import { asCategoryWithDetails } from '@/forum/types/ForumCategoryWithDetails'

export const useForumCategory = (id: string) => {
  const { loading, data } = useGetForumCategoryQuery({ variables: { where: { id } } })
  return {
    isLoading: loading,
    category: data?.forumCategoryByUniqueInput && asCategoryWithDetails(data.forumCategoryByUniqueInput),
  }
}
