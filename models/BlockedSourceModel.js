export default {
    checkSourceIfBlocked: async (sourceName) => {
        try {
            const blockedSource = await BlockedSource.findOne({
                sourceName: sourceName,
                status: "blocked"
            })
            if (blockedSource) {
                return true
            }
            return false
        } catch (error) {
            throw error
        }
    }
}
