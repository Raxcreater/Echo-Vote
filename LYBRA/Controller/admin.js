const Model = require("../Model/index");
const DAO = require("../DAO/index");
const access_Token = require("../Get_AccessToken/createToken");
const aggregate_ = require("../Aggregation /index");

// social login
const admin_login = async (payload) => {
  try {
    // Check if the user is already in the database
    let admin = await DAO.get_single_data(Model.admin, {
      email: payload.email,
      password: payload.password,
    });
    // update token
    let token = await access_Token.generateToken({ _id: admin._id });
    let update_token = await DAO.find_and_update_database(
      Model.admin,
      { _id: admin._id },
      { accessToken: token },
      { new: true }
    );
    return update_token;
  } catch (err) {
    return err;
  }
};

// LogOut
const logout = async (user) => {
  try {
    await DAO.find_and_update_database(
      Model.admin,
      { _id: user._id },
      { accessToken: null },
      { new: true }
    );
    return "Logout succesfull";
  } catch (err) {
    throw err;
  }
};

// create onboarding
const createonBoarding = async (payload) => {
  try {
    let update_data = {
      title: payload.newTitle,
      discription: payload.discription,
      image: payload.image,
    };
    let existing = await DAO.find_and_update_database(
      Model.getOnboard,
      {
        title: payload.title,
        isDeleted: false,
      },
      update_data,
      { new: true }
    );
    if (existing) {
      return existing;
    } else {
      const createonboarding = await DAO.save_data(Model.getOnboard, payload);
      return createonboarding;
    }
  } catch (err) {
    throw err;
  }
};

// delete onboarding
const deleteOnboarding = async (payload) => {
  try {
    const update_onboarding = await DAO.find_and_update_database(
      Model.getOnboard,
      { title: payload.title },
      { isDeleted: true },
      { new: true }
    );
    return update_onboarding;
  } catch (err) {
    throw err;
  }
};

// Terms & Condtions
const updateTermsConditions = async (payload) => {
  try {
    const fetchTermsconditions = await DAO.get_single_data(
      Model.termsConditions,
      {
        isDeleted: false,
      }
    );
    if (fetchTermsconditions) {
      const TermsConditions_updated = await DAO.find_and_update_database(
        Model.termsConditions,
        { isDeleted: false },
        { termsConditions: payload.termsConditions },
        { new: true }
      );
      return TermsConditions_updated;
    } else {
      const createTermasConditions = await DAO.save_data(
        Model.termsConditions,
        payload
      );
      return createTermasConditions;
    }
  } catch (err) {
    throw err;
  }
};

// Privacy Policy
const updateprivacyPolicy = async (payload) => {
  try {
    const fetchprivacyPolicy = await DAO.get_single_data(Model.privacyPolicy, {
      isDeleted: false,
    });
    if (fetchprivacyPolicy) {
      const privacyPolicy_updated = await DAO.find_and_update_database(
        Model.privacyPolicy,
        { isDeleted: false },
        { privacyPolicy: payload.privacyPolicy },
        { new: true }
      );
      return privacyPolicy_updated;
    } else {
      const createprivacyPolicy = await DAO.save_data(
        Model.privacyPolicy,
        payload
      );
      return createprivacyPolicy;
    }
  } catch (err) {
    throw err;
  }
};

// Delete user
const delete_user = async (payload) => {
  try {
    let delete_user = await DAO.find_and_update_database(
      Model.user,
      { _id: payload._id },
      { isDeleted: payload.isDeleted, access_Token: null }
    );
    return "user deleted";
  } catch (err) {
    throw err;
  }
};
// Delete post
const delete_post = async (payload) => {
  try {
    let delete_post = await DAO.find_and_update_database(
      Model.post,
      { _id: payload._id },
      { isDeleted: payload.isDeleted }
    );
    return "user post";
  } catch (err) {
    throw err;
  }
};
// Block post
const block_user = async (payload) => {
  try {
    let block_user = await DAO.find_and_update_database(
      Model.user,
      { _id: payload._id },
      { isBlocked: payload.isBlocked, access_Token: null }
    );
    return "user blocked";
  } catch (err) {
    throw err;
  }
};

// user listing with all the posts user have created
const userList = async () => {
  try {
    let query = [
      await aggregate_.user.lookup_user(),
      // await aggregate_.user.match_data(user), // if  we want user specific
      await aggregate_.user.unwind_user_data(),
      await aggregate_.user.group_data(),
      await aggregate_.user.project_data(),
      await aggregate_.user.sort_data(),
    ];

    let listing = await Model.user.aggregate(query);

    return listing;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// post listing where we have post with the user (creator) detail and partcipant details
let postList = async (payload) => {
  try {
    let get_user = await DAO.get_single_data(Model.user, { _id: payload._id });
    let query = [
      // await aggregate_.post.match_data(get_user),
      await aggregate_.post.lookup_user(),
      await aggregate_.post.unwind_user_data(),
      await aggregate_.post.set_user_data(),
      await aggregate_.post.lookup_participant(),
      await aggregate_.post.unwind_participant_data(),
      await aggregate_.post.set_participant_data(),
      await aggregate_.post.group_data(),
      await aggregate_.post.project_data(),
      await aggregate_.post.sort_data(),
    ];

    let listing = await Model.post.aggregate(query);

    return listing;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports = {
  admin_login,
  logout,

  createonBoarding,
  deleteOnboarding,
  updateTermsConditions,
  updateprivacyPolicy,

  delete_post,
  delete_user,
  block_user,

  postList,
  userList,
};

// // post listing
// let postList = async (payload, user) => {
//   try {
//     // let query = [
//     //   await match_data(user_data),
//     //   await lookupData(),
//     // ]
//     let listing = await Model.post.aggregate([
//       {
//         $match: {
//           isDeleted: false,
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "creator_detail",
//         },
//       },
//       { $unwind: "$creator_detail" },
//       {
//         $group: {
//           _id: "$_id",
//           image: { $first: "$image" },
//           creator_detail: { $push: "$creator_detail" },
//           createdAt: { $first: "$createdAt" },
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           image: 1,
//           name: { $first: "$creator_detail.name" },
//           phoneNumber: { $first: "$creator_detail.phoneNumber" },
//           createdAt: 1,
//         },
//       },
//       {
//         $sort: {
//           createdAt: 1, // or -1 for descending order
//         },
//       },
//       {
//         $skip: payload.skip || 0,
//       },
//       {
//         $limit: payload.limit || 2, // Set a default limit if not provided
//       },
//     ]);
//     return listing;
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }
// };
